"""
ATS (Applicant Tracking System) Model
Stores real ATS analysis results for candidates
"""
from models import db
from datetime import datetime
import json


class ATSAnalysis(db.Model):
    __tablename__ = 'ats_analysis'

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.String(100), nullable=False, index=True)
    job_id = db.Column(db.String(100), nullable=True, index=True)

    # Core ATS Score (0-100)
    overall_score = db.Column(db.Float, default=0.0)

    # Sub-scores
    skills_score = db.Column(db.Float, default=0.0)
    experience_score = db.Column(db.Float, default=0.0)
    education_score = db.Column(db.Float, default=0.0)
    keyword_score = db.Column(db.Float, default=0.0)

    # Analysis details (JSON stored as text)
    matched_skills_json = db.Column(db.Text, default='[]')
    missing_skills_json = db.Column(db.Text, default='[]')
    keywords_found_json = db.Column(db.Text, default='[]')
    keywords_missing_json = db.Column(db.Text, default='[]')

    # Resume text extracted
    resume_text = db.Column(db.Text, nullable=True)

    # Email eligibility
    has_official_email = db.Column(db.Boolean, default=False)
    email_notification_sent = db.Column(db.Boolean, default=False)
    email_sent_at = db.Column(db.DateTime, nullable=True)

    # Analysis metadata
    analysis_method = db.Column(db.String(50), default='ai')  # 'ai', 'keyword', 'hybrid'
    ai_model_used = db.Column(db.String(100), nullable=True)
    analysis_version = db.Column(db.String(20), default='1.0')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def matched_skills(self):
        try:
            return json.loads(self.matched_skills_json or '[]')
        except Exception:
            return []

    @matched_skills.setter
    def matched_skills(self, value):
        self.matched_skills_json = json.dumps(value or [])

    @property
    def missing_skills(self):
        try:
            return json.loads(self.missing_skills_json or '[]')
        except Exception:
            return []

    @missing_skills.setter
    def missing_skills(self, value):
        self.missing_skills_json = json.dumps(value or [])

    @property
    def keywords_found(self):
        try:
            return json.loads(self.keywords_found_json or '[]')
        except Exception:
            return []

    @keywords_found.setter
    def keywords_found(self, value):
        self.keywords_found_json = json.dumps(value or [])

    @property
    def keywords_missing(self):
        try:
            return json.loads(self.keywords_missing_json or '[]')
        except Exception:
            return []

    @keywords_missing.setter
    def keywords_missing(self, value):
        self.keywords_missing_json = json.dumps(value or [])

    def to_dict(self):
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'job_id': self.job_id,
            'overall_score': round(self.overall_score, 1),
            'sub_scores': {
                'skills': round(self.skills_score, 1),
                'experience': round(self.experience_score, 1),
                'education': round(self.education_score, 1),
                'keywords': round(self.keyword_score, 1),
            },
            'matched_skills': self.matched_skills,
            'missing_skills': self.missing_skills,
            'keywords_found': self.keywords_found,
            'keywords_missing': self.keywords_missing,
            'has_official_email': self.has_official_email,
            'email_notification_sent': self.email_notification_sent,
            'email_sent_at': self.email_sent_at.isoformat() if self.email_sent_at else None,
            'analysis_method': self.analysis_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<ATSAnalysis candidate={self.candidate_id} score={self.overall_score}>'