"""
Wellness Service - Business logic for wellness operations
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from models.wellness import WellnessCheckin, WellnessInsight
from wellness.wellness_module import WellnessCoach, WellnessInput
from services.ai_service import AIService

logger = logging.getLogger(__name__)


class WellnessService:
    def __init__(self, ai_service: Optional[AIService] = None):
        self.coach      = WellnessCoach()
        self.ai_service = ai_service

    def _uid(self, user_id) -> str:
        if user_id is None:
            raise ValueError("user_id is required")
        return str(user_id).strip()

    # ── Check-in status ───────────────────────────────────────────────────────
    def get_checkin_status(self, user_id) -> Dict:
        uid            = self._uid(user_id)
        today_checkins = WellnessCheckin.get_today_checkins(uid) or []
        today_count    = len(today_checkins)
        return {
            'today_checkins':  today_count,
            'remaining':       max(0, 2 - today_count),
            'can_checkin':     today_count < 2,
            'checkin_number':  today_count + 1,
            'daily_completed': today_count >= 2
        }

    # ── Create check-in ───────────────────────────────────────────────────────
    def create_checkin(self, user_id, data: Dict) -> Dict:
        from models import db

        uid    = self._uid(user_id)
        status = self.get_checkin_status(uid)
        if not status['can_checkin']:
            raise ValueError("Maximum check-ins for today reached")

        wellness_input = WellnessInput(
            mood=data['mood'],
            stress=data['stress'],
            sleep=data['sleep'],
            energy=data['energy'],
            productivity=data['productivity'],
            message=data.get('message', '')
        )
        result = self.coach.wellness_coach(wellness_input)

        burnout        = result.get('burnout_risk', {})
        burnout_level  = burnout.get('level', 'LOW')  if isinstance(burnout, dict) else str(burnout)
        burnout_points = burnout.get('score', 0)      if isinstance(burnout, dict) else 0

        # Store simple text list in DB (backward-compatible)
        simple_recs = result.get('recommendations', [])

        checkin = WellnessCheckin(
            user_id        = uid,
            mood           = data['mood'],
            stress         = data['stress'],
            sleep          = data['sleep'],
            energy         = data['energy'],
            productivity   = data['productivity'],
            message        = data.get('message', ''),
            wellness_score = result['wellness_score'],
            burnout_risk   = burnout_level,
            burnout_points = burnout_points,
            sentiment_label = result.get('sentiment', 'NEUTRAL'),
            sentiment_score = result.get('sentiment_score', 0.5),
            emotion_label  = result.get('emotion', 'neutral'),
            emotion_score  = result.get('emotion_score', 0.5),
            recommendations = json.dumps(simple_recs),
            checkin_number = status['checkin_number']
        )
        db.session.add(checkin)
        db.session.commit()

        self._generate_insights(uid, checkin)

        response = checkin.to_dict()
        # Send the rich detailed_recommendations to the frontend
        response['detailed_recommendations'] = result.get('detailed_recommendations', [])
        response['recommendations']           = simple_recs
        response['insights']                  = result.get('insights', [])
        response['burnout_risk']              = burnout
        response['category_scores']           = result.get('category_scores', {})
        response['wellness_level']            = result.get('wellness_level', '')
        return response

    # ── Weekly wellness ────────────────────────────────────────────────────────
    def get_weekly_wellness(self, user_id, days: int = 7) -> Dict:
        uid      = self._uid(user_id)
        cutoff   = datetime.utcnow() - timedelta(days=days)
        checkins = WellnessCheckin.query.filter(
            WellnessCheckin.user_id == uid,
            WellnessCheckin.created_at >= cutoff
        ).order_by(WellnessCheckin.created_at.asc()).all()

        daily_data = {}
        for c in checkins:
            d = c.created_at.date()
            if d not in daily_data:
                daily_data[d] = {
                    'checkins':        [],
                    'wellness_scores': [],
                    'completed':       0,
                    'day_name':        d.strftime('%a')
                }
            daily_data[d]['checkins'].append(c)
            daily_data[d]['wellness_scores'].append(c.wellness_score)
            daily_data[d]['completed'] += 1

        weekly_data     = []
        total_score_sum = 0
        completed_days  = 0
        today           = datetime.utcnow().date()

        for i in range(days):
            date = today - timedelta(days=days - 1 - i)
            if date in daily_data:
                info      = daily_data[date]
                avg_score = sum(info['wellness_scores']) / len(info['wellness_scores'])
                total_score_sum += avg_score
                if info['completed'] >= 2:
                    completed_days += 1

                checkin_details = []
                for c in info['checkins']:
                    try:
                        recs = json.loads(c.recommendations) if c.recommendations else []
                    except Exception:
                        recs = []
                    checkin_details.append({
                        'id':              c.id,
                        'checkin_number':  c.checkin_number,
                        'wellness_score':  c.wellness_score,
                        'mood':            c.mood,
                        'stress':          c.stress,
                        'sleep':           c.sleep,
                        'energy':          c.energy,
                        'productivity':    c.productivity,
                        'burnout_risk':    c.burnout_risk,
                        'emotion':         c.emotion_label,
                        'sentiment':       c.sentiment_label,
                        'message':         c.message or '',
                        'recommendations': recs,
                        'time':            c.created_at.strftime('%I:%M %p'),
                        'created_at':      c.created_at.isoformat(),
                    })

                weekly_data.append({
                    'date':            date.isoformat(),
                    'day_name':        date.strftime('%a'),
                    'full_date':       date.strftime('%B %d, %Y'),
                    'completed':       info['completed'] >= 2,
                    'checkins':        info['completed'],
                    'wellness_score':  round(avg_score, 1),
                    'checkin_details': checkin_details,
                })
            else:
                weekly_data.append({
                    'date':            date.isoformat(),
                    'day_name':        date.strftime('%a'),
                    'full_date':       date.strftime('%B %d, %Y'),
                    'completed':       False,
                    'checkins':        0,
                    'wellness_score':  0,
                    'checkin_details': [],
                })

        streak     = self._calculate_streak(checkins)
        avg_weekly = round(total_score_sum / completed_days, 1) if completed_days > 0 else 0

        return {
            'streak':              streak,
            'avg_weekly':          avg_weekly,
            'total_checkins_week': len(checkins),
            'completed_days':      completed_days,
            'weekly_data':         weekly_data
        }

    # ── History ────────────────────────────────────────────────────────────────
    def get_wellness_history(self, user_id, limit: int = 30) -> Dict:
        uid      = self._uid(user_id)
        checkins = WellnessCheckin.query.filter_by(user_id=uid).order_by(
            WellnessCheckin.created_at.desc()).limit(limit).all()
        checkins_dict = [c.to_dict() for c in checkins]
        return {
            'checkins':       checkins_dict,
            'trends':         self._analyze_trends(checkins_dict),
            'weekly_summary': self._get_weekly_summary(checkins_dict),
            'total':          len(checkins_dict)
        }

    # ── Stats ──────────────────────────────────────────────────────────────────
    def get_user_stats(self, user_id) -> Dict:
        uid = self._uid(user_id)
        raw = WellnessCheckin.get_user_stats(uid)

        if raw is None:
            stats = {}
        elif hasattr(raw, '_asdict'):
            stats = raw._asdict()
        elif hasattr(raw, '__dict__'):
            stats = {k: v for k, v in raw.__dict__.items() if not k.startswith('_')}
        elif isinstance(raw, dict):
            stats = raw
        else:
            try:
                stats = dict(raw)
            except Exception:
                stats = {}

        checkins = WellnessCheckin.query.filter_by(user_id=uid).order_by(
            WellnessCheckin.created_at.desc()).all()
        return {**stats, 'streak': self._calculate_streak(checkins)}

    # ── Insights ───────────────────────────────────────────────────────────────
    def get_insights(self, user_id, limit: int = 10) -> List[Dict]:
        uid = self._uid(user_id)
        return [
            i.to_dict()
            for i in WellnessInsight.query.filter_by(user_id=uid).order_by(
                WellnessInsight.created_at.desc()
            ).limit(limit).all()
        ]

    # ── Private helpers ────────────────────────────────────────────────────────
    def _generate_insights(self, user_id, checkin):
        from models import db

        uid    = self._uid(user_id)
        recent = WellnessCheckin.query.filter_by(user_id=uid).order_by(
            WellnessCheckin.created_at.desc()).limit(10).all()
        insights = []

        low_scores = [c for c in recent[:5] if c.wellness_score < 40]
        if len(low_scores) >= 3:
            insights.append({
                'type':        'warning',
                'title':       'Wellness Alert',
                'description': 'Multiple consecutive low scores detected. Consider speaking with HR or a counsellor.',
                'priority':    3
            })

        if len(recent) >= 6:
            recent_avg  = sum(c.wellness_score for c in recent[:3]) / 3
            earlier_avg = sum(c.wellness_score for c in recent[3:6]) / 3
            if recent_avg > earlier_avg + 10:
                insights.append({
                    'type':        'trend',
                    'title':       'Improving Trend',
                    'description': 'Your wellness scores have risen significantly over the past week. Keep it up!',
                    'priority':    2
                })
            elif recent_avg < earlier_avg - 10:
                insights.append({
                    'type':        'warning',
                    'title':       'Declining Trend',
                    'description': 'Your wellness has been declining. Review your sleep, stress, and recovery habits.',
                    'priority':    3
                })

        for d in insights:
            db.session.add(WellnessInsight(
                user_id      = uid,
                insight_type = d['type'],
                title        = d['title'],
                description  = d['description'],
                priority     = d['priority']
            ))
        db.session.commit()

    def _calculate_streak(self, checkins) -> int:
        if not checkins:
            return 0
        dates        = {c.created_at.date() for c in checkins}
        streak       = 0
        current_date = datetime.utcnow().date()
        while True:
            if current_date in dates:
                streak += 1
                current_date -= timedelta(days=1)
            elif current_date == datetime.utcnow().date():
                # Today has no check-in yet — still allow streak from yesterday
                current_date -= timedelta(days=1)
            else:
                break
        return streak

    def _analyze_trends(self, checkins: List[Dict]) -> Dict:
        if len(checkins) < 4:
            return {
                'trend':     'insufficient_data',
                'message':   'Complete more check-ins to see trends',
                'improving': False
            }
        recent_avg = sum(c['wellness_score'] for c in checkins[:3]) / 3
        older_avg  = sum(c['wellness_score'] for c in checkins[3:6]) / max(len(checkins[3:6]), 1)
        diff = recent_avg - older_avg
        if diff > 5:
            return {'trend': 'improving', 'message': 'Your wellness is improving!', 'improving': True}
        elif diff < -5:
            return {'trend': 'declining', 'message': 'Your wellness has been declining.', 'improving': False}
        return {'trend': 'stable', 'message': 'Your wellness is relatively stable.', 'improving': False}

    def _get_weekly_summary(self, checkins: List[Dict]) -> Dict:
        if not checkins:
            return {
                'total_checkins':     0,
                'days_with_checkins': 0,
                'avg_wellness':       0,
                'best_day':           None,
                'best_score':         0,
                'worst_day':          None,
                'worst_score':        100
            }
        scores = [c['wellness_score'] for c in checkins]
        best   = max(checkins, key=lambda c: c['wellness_score'])
        worst  = min(checkins, key=lambda c: c['wellness_score'])
        dates  = {c.get('created_at', '')[:10] for c in checkins if c.get('created_at')}
        return {
            'total_checkins':     len(checkins),
            'days_with_checkins': len(dates),
            'avg_wellness':       round(sum(scores) / len(scores), 1),
            'best_day':           best.get('created_at', '')[:10],
            'best_score':         best['wellness_score'],
            'worst_day':          worst.get('created_at', '')[:10],
            'worst_score':        worst['wellness_score']
        }