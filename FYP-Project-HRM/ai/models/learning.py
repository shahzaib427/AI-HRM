"""
Learning Hub Models
"""
from datetime import datetime
from models import db


class LearningProfile(db.Model):
    __tablename__ = 'learning_profiles'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, unique=True, index=True)
    level = db.Column(db.String(50), default='Beginner')          # Beginner / Intermediate / Advanced
    preferred_format = db.Column(db.String(50), default='Video')  # Video / Article / Project
    weekly_hours = db.Column(db.Integer, default=5)
    current_skills = db.Column(db.Text, default='')               # comma-separated
    target_skills = db.Column(db.Text, default='')                # comma-separated
    job_role = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'level': self.level,
            'preferred_format': self.preferred_format,
            'weekly_hours': self.weekly_hours,
            'current_skills': [s.strip() for s in self.current_skills.split(',') if s.strip()],
            'target_skills': [s.strip() for s in self.target_skills.split(',') if s.strip()],
            'job_role': self.job_role,
        }


class CourseEnrollment(db.Model):
    __tablename__ = 'course_enrollments'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    course_id = db.Column(db.String(100), nullable=False)
    course_title = db.Column(db.String(300), nullable=False)
    platform = db.Column(db.String(100), default='')
    progress = db.Column(db.Integer, default=0)        # 0-100 %
    completed = db.Column(db.Boolean, default=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_title': self.course_title,
            'platform': self.platform,
            'progress': self.progress,
            'completed': self.completed,
            'enrolled_at': self.enrolled_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class SkillDetectionLog(db.Model):
    """Track every skill-detection run so analytics are possible later."""
    __tablename__ = 'skill_detection_logs'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    source = db.Column(db.String(50), nullable=False)   # 'resume' | 'job_role' | 'projects' | 'manual'
    detected_skills = db.Column(db.Text, default='')    # JSON string
    confidence_scores = db.Column(db.Text, default='')  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'source': self.source,
            'detected_skills': json.loads(self.detected_skills) if self.detected_skills else [],
            'confidence_scores': json.loads(self.confidence_scores) if self.confidence_scores else {},
            'created_at': self.created_at.isoformat(),
        }


class LearningActivity(db.Model):
    """Daily learning activity log for streak tracking."""
    __tablename__ = 'learning_activities'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    activity_type = db.Column(db.String(50), nullable=False)  # 'course_start' | 'daily_task' | 'skill_added'
    description = db.Column(db.String(300), default='')
    minutes_spent = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'activity_type': self.activity_type,
            'description': self.description,
            'minutes_spent': self.minutes_spent,
            'created_at': self.created_at.isoformat(),
        }
