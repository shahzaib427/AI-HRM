# routes/career_routes.py - COMPLETE UPDATED VERSION
from flask import Blueprint, jsonify
from controllers.career_controller import CareerController

career_bp = Blueprint('career', __name__)

# Handle OPTIONS for CORS preflight
@career_bp.route('/profile', methods=['OPTIONS'])
@career_bp.route('/recommendations', methods=['OPTIONS'])
@career_bp.route('/analyze-skill-gap', methods=['OPTIONS'])
@career_bp.route('/job-alerts', methods=['OPTIONS'])
@career_bp.route('/scholarships', methods=['OPTIONS'])
@career_bp.route('/resume-tips', methods=['OPTIONS'])
@career_bp.route('/interview-tips', methods=['OPTIONS'])
@career_bp.route('/freelancing-guide', methods=['OPTIONS'])
@career_bp.route('/skills', methods=['OPTIONS'])
@career_bp.route('/institutes', methods=['OPTIONS'])
@career_bp.route('/interview-questions', methods=['OPTIONS'])
def handle_options():
    """Handle CORS preflight requests without parameters"""
    return jsonify({}), 200

# Special handler for market-insights with role parameter
@career_bp.route('/market-insights/<path:role>', methods=['OPTIONS'])
def handle_options_with_role(role):
    """Handle CORS preflight requests for market-insights with role parameter"""
    return jsonify({}), 200

# Profile routes
@career_bp.route('/profile', methods=['GET'])
def get_profile():
    return CareerController.get_profile_public()

@career_bp.route('/profile', methods=['PUT'])
def update_profile():
    return CareerController.update_profile()

# Career recommendations
@career_bp.route('/recommendations', methods=['GET'])
def get_recommendations():
    return CareerController.get_recommendations_public()

# Skill gap analysis
@career_bp.route('/analyze-skill-gap', methods=['POST'])
def analyze_skill_gap():
    return CareerController.analyze_skill_gap()

# Market insights
@career_bp.route('/market-insights/<path:role>', methods=['GET'])
def get_market_insights(role):
    return CareerController.get_market_insights(role)

# Job alerts
@career_bp.route('/job-alerts', methods=['GET'])
def get_job_alerts():
    return CareerController.get_job_alerts_public()

# Scholarships
@career_bp.route('/scholarships', methods=['GET'])
def get_scholarships():
    return CareerController.get_scholarships_public()

# Resume tips
@career_bp.route('/resume-tips', methods=['GET'])
def get_resume_tips():
    return CareerController.get_resume_tips()

# Interview tips
@career_bp.route('/interview-tips', methods=['GET'])
def get_interview_tips():
    return CareerController.get_interview_tips()

# Freelancing guide
@career_bp.route('/freelancing-guide', methods=['GET'])
def get_freelancing_guide():
    return CareerController.get_freelancing_guide()

# ============= NEW ROUTES =============
# Skills & Future Trends
@career_bp.route('/skills', methods=['GET'])
def get_skills():
    return CareerController.get_skills()

# Training Institutes
@career_bp.route('/institutes', methods=['GET'])
def get_institutes():
    return CareerController.get_institutes()

# Interview Questions
@career_bp.route('/interview-questions', methods=['GET'])
def get_interview_questions():
    return CareerController.get_interview_questions()