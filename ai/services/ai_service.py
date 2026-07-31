# services/ai_service.py  (productivity section — merge with your existing file)
import sys
import os
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)

# ----------------------------
# Import AI modules safely
# ----------------------------
try:
    from boat.boat_module import predict as boat_predict
except ImportError:
    logger.warning("boat module not found — HR chat disabled")
    boat_predict = None

try:
    from ai_career_coach.ai_career_coach_module import predict as ai_career_predict
except ImportError:
    logger.warning("ai_career_coach module not found — career features disabled")
    ai_career_predict = None




class AIService:

    # ========================= CAREER METHODS =========================
    @staticmethod
    def get_career_recommendations(user_id, profile):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_recommendations', 'user_id': user_id, 'profile': profile})

    @staticmethod
    def analyze_skill_gap(target_role, current_skills, profile):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'analyze_skill_gap', 'target_role': target_role,
                                  'current_skills': current_skills, 'profile': profile})

    @staticmethod
    def get_market_insights(role):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_market_insights', 'role': role, 'country': 'Pakistan'})

    @staticmethod
    def get_job_alerts(skills, location):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_job_alerts', 'skills': skills, 'location': location})

    @staticmethod
    def get_scholarships(education_level):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_scholarships', 'education_level': education_level})

    @staticmethod
    def get_resume_tips():
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_resume_tips'})

    @staticmethod
    def get_interview_tips():
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_interview_tips'})

    @staticmethod
    def get_freelancing_guide():
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_freelancing_guide'})

    @staticmethod
    def chat_career(message, user_name, user_id, profile):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({
            'action': 'chat',
            'message': message,
            'user_name': user_name,
            'session_id': user_id,
            'profile': profile,
        })

    @staticmethod
    def get_interview_questions(domain, limit):
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_interview_questions', 'domain': domain, 'limit': limit})

    @staticmethod
    def get_in_demand_skills():
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_in_demand_skills'})

    @staticmethod
    def get_training_institutes():
        if not ai_career_predict:
            return {'status': 'error', 'message': 'Career module unavailable'}
        return ai_career_predict({'action': 'get_training_institutes'})

    # ========================= HR ASSISTANT =========================
    @staticmethod
    def chat_hr(message):
        if not boat_predict:
            return {'status': 'error', 'message': 'HR module unavailable'}
        return boat_predict({'action': 'ask', 'question': message})


        """Weekly AI insights from real session data, with guaranteed fallback."""
        if not sessions:
            return {
                'status': 'success',
                'data': {
                    'total_focus': 0,
                    'recommendation': 'Complete some focus sessions to unlock AI insights!',
                    'tip': 'Start with a 25-minute focus session today.',
                },
            }

        # Try real AI module first
        if ai_productivity_predict:
            try:
                result = ai_productivity_predict({
                    'action': 'weekly_insights',
                    'sessions': sessions,
                })
                if result.get('status') == 'success':
                    return result
            except Exception as e:
                logger.warning(f"AI weekly insights error: {e}")

        # Fallback — derived from actual data
        total_focus = sum(s.get('duration_minutes', 0) for s in sessions)
        avg_focus = total_focus / len(sessions)

        if total_focus >= 600:
            recommendation = "Outstanding week! You're in the top tier of focused workers."
        elif total_focus >= 300:
            recommendation = "Good progress! Maintain this consistency next week."
        else:
            recommendation = "Small steps lead to big results. Aim for 1 hour of focus daily."

        if avg_focus < 25:
            tip = "Extend your sessions to 25–30 minutes for a better flow state."
        elif avg_focus > 60:
            tip = "Great deep work! Take regular breaks to sustain this long-term."
        else:
            tip = "You've found your focus sweet spot — keep the momentum!"

        return {
            'status': 'success',
            'data': {
                'total_focus': total_focus,
                'avg_session': round(avg_focus, 1),
                'recommendation': recommendation,
                'tip': tip,
                'total_sessions': len(sessions),
            },
        }