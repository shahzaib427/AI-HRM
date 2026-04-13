# routes/profile_routes.py
from flask import Blueprint, jsonify
from controllers.career_controller import CareerController

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile', methods=['OPTIONS'])
def handle_options():
    return jsonify({}), 200

@profile_bp.route('/profile', methods=['GET'])
def get_profile():
    return CareerController.get_profile_public()

@profile_bp.route('/profile', methods=['PUT'])
def update_profile():
    return CareerController.update_profile()