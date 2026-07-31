# models/career.py - UPDATED VERSION
from datetime import datetime
import json
from models import db

class CareerRecommendation(db.Model):
    """Career recommendations model"""
    __tablename__ = 'career_recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), default='')
    description = db.Column(db.Text, default='')
    confidence = db.Column(db.Integer, default=0)
    timeline = db.Column(db.String(50), default='')
    steps = db.Column(db.Text, default='[]')  # JSON string
    salary_range = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary with safe JSON parsing"""
        steps = []
        if self.steps:
            try:
                steps = json.loads(self.steps)
                if not isinstance(steps, list):
                    steps = []
            except (json.JSONDecodeError, TypeError):
                steps = []
        
        return {
            'id': self.id,
            'title': self.title or '',
            'description': self.description or '',
            'confidence': self.confidence or 0,
            'timeline': self.timeline or '',
            'steps': steps,
            'salary_range': self.salary_range or ''
        }
    
    def __repr__(self):
        return f'<CareerRecommendation user_id={self.user_id} title={self.title}>'


class SkillGapAnalysis(db.Model):
    """Skill gap analysis model"""
    __tablename__ = 'skill_gap_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_role = db.Column(db.String(100), default='')
    skill_name = db.Column(db.String(100), default='')
    current_level = db.Column(db.Integer, default=0)
    target_level = db.Column(db.Integer, default=0)
    importance = db.Column(db.String(20), default='')
    resources = db.Column(db.Text, default='[]')  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary with safe JSON parsing"""
        resources = []
        if self.resources:
            try:
                resources = json.loads(self.resources)
                if not isinstance(resources, list):
                    resources = []
            except (json.JSONDecodeError, TypeError):
                resources = []
        
        return {
            'skill': self.skill_name or '',
            'current': self.current_level or 0,
            'target': self.target_level or 0,
            'importance': self.importance or '',
            'gap': (self.target_level or 0) - (self.current_level or 0),
            'resources': resources
        }
    
    def to_api_dict(self):
        """Convert to API-friendly format"""
        resources = []
        if self.resources:
            try:
                resources = json.loads(self.resources)
                if not isinstance(resources, list):
                    resources = []
            except (json.JSONDecodeError, TypeError):
                resources = []
        
        return {
            'skill': self.skill_name or '',
            'current': self.current_level or 0,
            'target': self.target_level or 0,
            'importance': self.importance or '',
            'resources': resources
        }
    
    def __repr__(self):
        return f'<SkillGapAnalysis user_id={self.user_id} skill={self.skill_name}>'


class JobAlert(db.Model):
    """Job alerts model"""
    __tablename__ = 'job_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), default='')
    company = db.Column(db.String(100), default='')
    location = db.Column(db.String(100), default='')
    salary = db.Column(db.String(100), default='')
    skills = db.Column(db.Text, default='[]')  # JSON string
    apply_url = db.Column(db.String(500), default='')
    posted_date = db.Column(db.String(50), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary with safe JSON parsing"""
        skills = []
        if self.skills:
            try:
                skills = json.loads(self.skills)
                if not isinstance(skills, list):
                    skills = []
            except (json.JSONDecodeError, TypeError):
                skills = []
        
        return {
            'id': self.id,
            'title': self.title or '',
            'company': self.company or '',
            'location': self.location or '',
            'salary': self.salary or '',
            'skills': skills,
            'apply_url': self.apply_url or '',
            'posted': self.posted_date or ''
        }
    
    def __repr__(self):
        return f'<JobAlert user_id={self.user_id} title={self.title}>'


class Scholarship(db.Model):
    """Scholarships model (if you want to store locally)"""
    __tablename__ = 'scholarships'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    provider = db.Column(db.String(200), default='')
    coverage = db.Column(db.String(200), default='')
    deadline = db.Column(db.String(100), default='')
    eligibility = db.Column(db.Text, default='')
    apply_url = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name or '',
            'provider': self.provider or '',
            'coverage': self.coverage or '',
            'deadline': self.deadline or '',
            'eligibility': self.eligibility or '',
            'apply_url': self.apply_url or ''
        }
    
    def __repr__(self):
        return f'<Scholarship name={self.name}>'