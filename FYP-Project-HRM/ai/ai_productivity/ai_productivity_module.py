# ai/ai_productivity/ai_productivity_module.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup (shared across the module)
db = SQLAlchemy()

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    time_entries = db.relationship('TimeEntry', backref='user', lazy=True)
    focus_sessions = db.relationship('FocusSession', backref='user', lazy=True)
    distractions = db.relationship('Distraction', backref='user', lazy=True)

class TimeEntry(db.Model):
    __tablename__ = 'time_entries'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    productive_hours = db.Column(db.Float, default=0)
    meetings = db.Column(db.Float, default=0)
    breaks = db.Column(db.Float, default=0)
    distractions = db.Column(db.Float, default=0)
    deep_work = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'date', name='unique_user_date'),)

class FocusSession(db.Model):
    __tablename__ = 'focus_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    task = db.Column(db.String(200), nullable=False)
    duration = db.Column(db.Integer)  # in minutes
    focus_score = db.Column(db.Integer)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Distraction(db.Model):
    __tablename__ = 'distractions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    source = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    duration = db.Column(db.Integer, default=5)  # minutes lost
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ProductivityAnalyzer:
    def __init__(self):
        self.productivity_weights = {
            'productive_hours': 10,
            'deep_work': 15,
            'distractions': -20,
            'meetings': -5,
            'breaks': -3
        }
    
    def calculate_productivity_score(self, time_entry):
        """Calculate productivity score from real time entry data"""
        try:
            score = (
                time_entry.productive_hours * self.productivity_weights['productive_hours'] +
                time_entry.deep_work * self.productivity_weights['deep_work'] +
                time_entry.distractions * self.productivity_weights['distractions'] +
                time_entry.meetings * self.productivity_weights['meetings'] +
                time_entry.breaks * self.productivity_weights['breaks']
            )
            
            return max(0, min(100, round(score, 2)))
        except Exception as e:
            logger.error(f"Error calculating score: {e}")
            return 0
    
    def generate_ai_suggestions(self, time_entry, distractions, focus_sessions):
        """Generate personalized AI suggestions based on real user data"""
        suggestions = []
        
        try:
            # Analyze distraction patterns
            if time_entry.distractions > 0.5:
                total_distraction_time = sum(d.duration for d in distractions)
                suggestions.append({
                    "id": 1,
                    "title": "Reduce Digital Distractions",
                    "description": f"You lost {total_distraction_time} minutes to distractions today. Try the Pomodoro technique.",
                    "impact": f"Save {total_distraction_time} mins daily",
                    "priority": "high" if time_entry.distractions > 1 else "medium",
                    "category": "focus"
                })
            
            # Analyze meeting efficiency
            if time_entry.meetings > 2:
                suggestions.append({
                    "id": 2,
                    "title": "Optimize Meeting Schedule",
                    "description": "You spent 2+ hours in meetings. Try to consolidate or shorten meetings.",
                    "impact": f"Save {int((time_entry.meetings - 1.5) * 60)} mins daily",
                    "priority": "high",
                    "category": "meetings"
                })
            
            # Analyze deep work
            if time_entry.deep_work < 3:
                suggestions.append({
                    "id": 3,
                    "title": "Increase Deep Work",
                    "description": "Schedule 3 hours of uninterrupted deep work before noon.",
                    "impact": "Increase productivity by 30%",
                    "priority": "high",
                    "category": "focus"
                })
            
            # Analyze break patterns
            if time_entry.breaks < 1:
                suggestions.append({
                    "id": 4,
                    "title": "Take Regular Breaks",
                    "description": "Take a 5-minute break every hour to maintain energy.",
                    "impact": "Improve focus by 20%",
                    "priority": "medium",
                    "category": "breaks"
                })
            
            # Analyze focus session completion
            if focus_sessions:
                completion_rate = len([s for s in focus_sessions if s.completed]) / len(focus_sessions)
                if completion_rate < 0.5:
                    suggestions.append({
                        "id": 5,
                        "title": "Complete Focus Sessions",
                        "description": f"You complete only {int(completion_rate * 100)}% of sessions. Set realistic goals.",
                        "impact": "25% more tasks completed",
                        "priority": "medium",
                        "category": "planning"
                    })
            
            return suggestions[:3]  # Return top 3 suggestions
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []

# Global instances
analyzer = ProductivityAnalyzer()

def init_app(app):
    """Initialize the module with Flask app context"""
    db.init_app(app)
    with app.app_context():
        db.create_all()

def predict(data):
    """
    Predict productivity insights and suggestions based on user data
    
    Expected data formats:
    1. User authentication: {'action': 'login', 'username': 'john', 'email': 'john@example.com'}
    2. Get today's data: {'action': 'get_today', 'user_id': 1}
    3. Update time tracking: {'action': 'update_time', 'user_id': 1, 'data': {...}}
    4. Start focus session: {'action': 'start_session', 'user_id': 1, 'task': '...'}
    5. End focus session: {'action': 'end_session', 'user_id': 1, 'session_id': 1}
    6. Log distraction: {'action': 'log_distraction', 'user_id': 1, 'source': '...', 'duration': 5}
    7. Get history: {'action': 'get_history', 'user_id': 1, 'days': 30}
    
    Returns: {
        'status': 'success',
        'data': {...}
    }
    """
    try:
        action = data.get('action')
        user_id = data.get('user_id')
        
        if action == 'login':
            return _handle_login(data)
        
        elif action == 'get_today':
            return _handle_get_today(user_id)
        
        elif action == 'update_time':
            return _handle_update_time(user_id, data.get('data', {}))
        
        elif action == 'start_session':
            return _handle_start_session(user_id, data.get('task', 'Deep Work Session'))
        
        elif action == 'end_session':
            return _handle_end_session(user_id, data.get('session_id'))
        
        elif action == 'log_distraction':
            return _handle_log_distraction(user_id, data.get('source'), data.get('duration', 5))
        
        elif action == 'get_history':
            return _handle_get_history(user_id, data.get('days', 30))
        
        elif action == 'health':
            return {
                'status': 'success',
                'data': {
                    'status': 'healthy',
                    'timestamp': datetime.now().isoformat()
                }
            }
        
        else:
            return {
                'status': 'error',
                'message': f'Unknown action: {action}'
            }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }

def _handle_login(data):
    """Handle user login"""
    try:
        username = data.get('username')
        email = data.get('email', f"{username}@example.com")
        
        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(username=username, email=email)
            db.session.add(user)
            db.session.commit()
        
        return {
            'status': 'success',
            'data': {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }
        }
    except Exception as e:
        logger.error(f"Login error: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_get_today(user_id):
    """Get today's productivity data"""
    try:
        today = datetime.utcnow().date()
        
        # Get today's time entry
        time_entry = TimeEntry.query.filter_by(user_id=user_id, date=today).first()
        if not time_entry:
            time_entry = TimeEntry(user_id=user_id, date=today)
            db.session.add(time_entry)
            db.session.commit()
        
        # Get today's focus sessions
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        focus_sessions = FocusSession.query.filter(
            FocusSession.user_id == user_id,
            FocusSession.start_time >= today_start,
            FocusSession.start_time <= today_end
        ).all()
        
        # Get today's distractions
        distractions = Distraction.query.filter(
            Distraction.user_id == user_id,
            Distraction.timestamp >= today_start,
            Distraction.timestamp <= today_end
        ).all()
        
        # Calculate scores
        today_score = analyzer.calculate_productivity_score(time_entry)
        
        # Calculate weekly average
        week_ago = today - timedelta(days=7)
        weekly_entries = TimeEntry.query.filter(
            TimeEntry.user_id == user_id,
            TimeEntry.date >= week_ago,
            TimeEntry.date <= today
        ).all()
        
        weekly_scores = [analyzer.calculate_productivity_score(entry) for entry in weekly_entries]
        week_score = sum(weekly_scores) / len(weekly_scores) if weekly_scores else 0
        
        # Calculate monthly average
        month_ago = today - timedelta(days=30)
        monthly_entries = TimeEntry.query.filter(
            TimeEntry.user_id == user_id,
            TimeEntry.date >= month_ago,
            TimeEntry.date <= today
        ).all()
        
        monthly_scores = [analyzer.calculate_productivity_score(entry) for entry in monthly_entries]
        month_score = sum(monthly_scores) / len(monthly_scores) if monthly_scores else 0
        
        # Generate suggestions
        suggestions = analyzer.generate_ai_suggestions(time_entry, distractions, focus_sessions)
        
        return {
            'status': 'success',
            'data': {
                'productivity_score': {
                    'today': today_score,
                    'week': round(week_score, 2),
                    'month': round(month_score, 2),
                    'focus': round((time_entry.deep_work / 5) * 100, 2),
                    'efficiency': round((time_entry.productive_hours / 8) * 100, 2)
                },
                'timeTracking': {
                    'productiveHours': time_entry.productive_hours,
                    'meetings': time_entry.meetings,
                    'breaks': time_entry.breaks,
                    'distractions': time_entry.distractions,
                    'deepWork': time_entry.deep_work
                },
                'focusSessions': [{
                    'id': s.id,
                    'task': s.task,
                    'duration': s.duration,
                    'focus': s.focus_score,
                    'completed': s.completed
                } for s in focus_sessions],
                'distractions': [{
                    'source': d.source,
                    'count': 1,
                    'time': d.duration
                } for d in distractions],
                'suggestions': suggestions,
                'timestamp': datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting today's data: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_update_time(user_id, time_data):
    """Update time tracking"""
    try:
        today = datetime.utcnow().date()
        
        time_entry = TimeEntry.query.filter_by(user_id=user_id, date=today).first()
        if not time_entry:
            time_entry = TimeEntry(user_id=user_id, date=today)
            db.session.add(time_entry)
        
        # Update fields
        if 'productiveHours' in time_data:
            time_entry.productive_hours = time_data['productiveHours']
        if 'meetings' in time_data:
            time_entry.meetings = time_data['meetings']
        if 'breaks' in time_data:
            time_entry.breaks = time_data['breaks']
        if 'distractions' in time_data:
            time_entry.distractions = time_data['distractions']
        if 'deepWork' in time_data:
            time_entry.deep_work = time_data['deepWork']
        
        db.session.commit()
        
        return {
            'status': 'success',
            'message': 'Time tracking updated'
        }
        
    except Exception as e:
        logger.error(f"Error updating time: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_start_session(user_id, task):
    """Start a focus session"""
    try:
        session_data = FocusSession(
            user_id=user_id,
            task=task,
            start_time=datetime.utcnow(),
            completed=False
        )
        
        db.session.add(session_data)
        db.session.commit()
        
        return {
            'status': 'success',
            'data': {
                'session_id': session_data.id
            }
        }
        
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_end_session(user_id, session_id):
    """End a focus session"""
    try:
        session_data = FocusSession.query.filter_by(id=session_id, user_id=user_id).first()
        if not session_data:
            return {'status': 'error', 'message': 'Session not found'}
        
        end_time = datetime.utcnow()
        duration = int((end_time - session_data.start_time).total_seconds() / 60)
        
        # Calculate focus score
        focus_score = min(100, max(0, 70 + (duration / 10)))
        
        session_data.end_time = end_time
        session_data.duration = duration
        session_data.focus_score = focus_score
        session_data.completed = True
        
        db.session.commit()
        
        # Update deep work hours
        today = datetime.utcnow().date()
        time_entry = TimeEntry.query.filter_by(user_id=user_id, date=today).first()
        if time_entry:
            time_entry.deep_work += duration / 60
            db.session.commit()
        
        return {
            'status': 'success',
            'data': {
                'session_id': session_data.id,
                'duration': duration,
                'focus': focus_score
            }
        }
        
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_log_distraction(user_id, source, duration=5):
    """Log a distraction"""
    try:
        distraction = Distraction(
            user_id=user_id,
            source=source,
            duration=duration
        )
        
        db.session.add(distraction)
        db.session.commit()
        
        # Update distraction time for today
        today = datetime.utcnow().date()
        time_entry = TimeEntry.query.filter_by(user_id=user_id, date=today).first()
        if time_entry:
            time_entry.distractions += duration / 60
            db.session.commit()
        
        return {
            'status': 'success',
            'message': 'Distraction logged'
        }
        
    except Exception as e:
        logger.error(f"Error logging distraction: {e}")
        return {'status': 'error', 'message': str(e)}

def _handle_get_history(user_id, days=30):
    """Get productivity history"""
    try:
        start_date = datetime.utcnow().date() - timedelta(days=days)
        
        entries = TimeEntry.query.filter(
            TimeEntry.user_id == user_id,
            TimeEntry.date >= start_date
        ).order_by(TimeEntry.date.desc()).all()
        
        history = []
        for entry in entries:
            score = analyzer.calculate_productivity_score(entry)
            history.append({
                'date': entry.date.isoformat(),
                'score': score,
                'productive_hours': entry.productive_hours,
                'deep_work': entry.deep_work,
                'distractions': entry.distractions,
                'meetings': entry.meetings,
                'breaks': entry.breaks
            })
        
        return {
            'status': 'success',
            'data': {
                'history': history
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        return {'status': 'error', 'message': str(e)}

# For testing the module directly
if __name__ == "__main__":
    # Test the predict function
    test_data = {
        'action': 'health'
    }
    result = predict(test_data)
    print(result)