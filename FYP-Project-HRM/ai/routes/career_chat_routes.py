# routes/career_chat_routes.py - Public version
from flask import Blueprint, jsonify
from controllers.career_chat_controller import CareerChatController

career_chat_bp = Blueprint('career_chat', __name__)

# Handle OPTIONS for CORS preflight
@career_chat_bp.route('/history', methods=['OPTIONS'])
@career_chat_bp.route('/send', methods=['OPTIONS'])
@career_chat_bp.route('/clear', methods=['OPTIONS'])
def handle_options():
    """Handle CORS preflight requests"""
    return jsonify({}), 200

# Chat endpoints - Using PUBLIC methods
@career_chat_bp.route('/history', methods=['GET'])
def get_history():
    """Get career chat history (public)"""
    return CareerChatController.get_history_public()

@career_chat_bp.route('/send', methods=['POST'])
def send_message():
    """Send message to Career Coach AI (public)"""
    return CareerChatController.send_message_public()

@career_chat_bp.route('/clear', methods=['DELETE'])
def clear_history():
    """Clear career chat history (public)"""
    return CareerChatController.clear_history_public()