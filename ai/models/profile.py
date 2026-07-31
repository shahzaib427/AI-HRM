# models/profile.py - UPDATED VERSION
from datetime import datetime
import json
from models import db

class UserProfile(db.Model):
    """User profile model for career coaching"""
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    current_role = db.Column(db.String(100), default='')
    experience_years = db.Column(db.Integer, default=0)
    education_level = db.Column(db.String(50), default='')
    skills = db.Column(db.Text, default='[]')  # JSON string
    interests = db.Column(db.Text, default='[]')  # JSON string
    career_goal = db.Column(db.String(100), default='')
    timeline = db.Column(db.String(50), default='')
    location = db.Column(db.String(100), default='')
    current_salary = db.Column(db.String(50), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert profile to dictionary with proper JSON parsing"""
        # Parse skills safely
        skills = []
        if self.skills:
            try:
                skills = json.loads(self.skills)
                if not isinstance(skills, list):
                    skills = []
            except (json.JSONDecodeError, TypeError):
                skills = []
        
        # Parse interests safely
        interests = []
        if self.interests:
            try:
                interests = json.loads(self.interests)
                if not isinstance(interests, list):
                    interests = []
            except (json.JSONDecodeError, TypeError):
                interests = []
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'current_role': self.current_role or '',
            'experience_years': self.experience_years or 0,
            'education_level': self.education_level or '',
            'skills': skills,
            'interests': interests,
            'career_goal': self.career_goal or '',
            'timeline': self.timeline or '',
            'location': self.location or '',
            'current_salary': self.current_salary or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_api_dict(self):
        """Convert to API-friendly format (without internal fields)"""
        return {
            'current_role': self.current_role or '',
            'experience_years': self.experience_years or 0,
            'education_level': self.education_level or '',
            'skills': json.loads(self.skills) if self.skills else [],
            'interests': json.loads(self.interests) if self.interests else [],
            'career_goal': self.career_goal or '',
            'timeline': self.timeline or '',
            'location': self.location or '',
            'current_salary': self.current_salary or ''
        }
    
    def update_from_dict(self, data):
        """Update profile from dictionary"""
        if 'current_role' in data:
            self.current_role = data['current_role']
        if 'experience_years' in data:
            self.experience_years = data['experience_years']
        if 'education_level' in data:
            self.education_level = data['education_level']
        if 'skills' in data:
            skills = data['skills']
            if isinstance(skills, list):
                self.skills = json.dumps(skills)
            elif isinstance(skills, str):
                self.skills = skills
        if 'interests' in data:
            interests = data['interests']
            if isinstance(interests, list):
                self.interests = json.dumps(interests)
            elif isinstance(interests, str):
                self.interests = interests
        if 'career_goal' in data:
            self.career_goal = data['career_goal']
        if 'timeline' in data:
            self.timeline = data['timeline']
        if 'location' in data:
            self.location = data['location']
        if 'current_salary' in data:
            self.current_salary = data['current_salary']
        
        self.updated_at = datetime.utcnow()
    
    def __repr__(self):
        return f'<UserProfile user_id={self.user_id} role={self.current_role}>'