# routes/learning_routes.py
from flask import Blueprint
from controllers.learning_controller import LearningController

learning_bp = Blueprint('learning_module', __name__)

# Skills & roles
learning_bp.route('/skills', methods=['GET'])(LearningController.get_skills)
learning_bp.route('/job-roles', methods=['GET'])(LearningController.get_job_roles)

# Core AI endpoints
learning_bp.route('/recommend', methods=['POST'])(LearningController.get_recommendations)
learning_bp.route('/detect-skills', methods=['POST'])(LearningController.detect_skills)
learning_bp.route('/upload-resume', methods=['POST'])(LearningController.upload_resume)
learning_bp.route('/learning-path', methods=['POST'])(LearningController.get_learning_path)
learning_bp.route('/daily-task', methods=['POST'])(LearningController.get_daily_task)

# Stats & profile
learning_bp.route('/stats', methods=['GET'])(LearningController.get_learning_stats)
learning_bp.route('/enroll', methods=['POST'])(LearningController.enroll_course)
learning_bp.route('/profile', methods=['GET'])(LearningController.get_profile)
learning_bp.route('/profile', methods=['PUT'])(LearningController.update_profile)
