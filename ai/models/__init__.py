# models/__init__.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models
from models.user import User
from models.profile import UserProfile
from models.chat import ChatMessage
from models.career import CareerRecommendation, SkillGapAnalysis, JobAlert
from models.wellness import WellnessInput, WellnessCoach