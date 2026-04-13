# controllers/career_chat_controller.py - FIXED VERSION
from flask import jsonify, request
from datetime import datetime
from services.ai_service import AIService
import logging

logger = logging.getLogger(__name__)

# Simple in-memory storage for anonymous chat history
anonymous_chats = {}

class CareerChatController:

    @staticmethod
    def send_message_public():
        """Send a chat message to Career Coach AI - PUBLIC (no login required)"""
        try:
            session_id = request.headers.get('X-Session-Id', 'anonymous')
            data = request.json
            message = data.get('message', '').strip()

            if not message:
                return jsonify({'error': 'No message provided'}), 400

            profile = data.get('profile', {})
            if not profile:
                profile = {
                    'current_role': 'Software Engineer',
                    'experience_years': 2,
                    'skills': ['JavaScript', 'React', 'Python'],
                    'career_goal': 'Senior Software Engineer',
                    'location': 'Pakistan'
                }

            user_name = data.get('user_name', 'there')

            # Call Career Coach AI
            result = AIService.chat_career(
                message=message,
                user_name=user_name,
                user_id=session_id,
                profile=profile
            )

            if result.get('status') == 'success':
                ai_response = result.get('ai_response', {})
                answer = ai_response.get('text', "I'm here to help with your career!")
                suggested_questions = result.get('suggested_questions', [])

                # ── FIX: pull intent and data from result ──────────────────────
                intent = result.get('intent', '')
                sidebar_data = result.get('data', {})
                # ───────────────────────────────────────────────────────────────
            else:
                answer = "I'm having trouble processing your request. Please try again later."
                suggested_questions = []
                intent = ''
                sidebar_data = {}

            # Store in memory
            if session_id not in anonymous_chats:
                anonymous_chats[session_id] = []
            anonymous_chats[session_id].append({
                'sender': 'user',
                'message': message,
                'timestamp': datetime.now().isoformat()
            })
            anonymous_chats[session_id].append({
                'sender': 'ai',
                'message': answer,
                'timestamp': datetime.now().isoformat()
            })

            # ── FIX: include intent and data in the response ───────────────────
            return jsonify({
                'status': 'success',
                'ai_response': {
                    'text': answer,
                    'timestamp': datetime.now().isoformat()
                },
                'suggested_questions': suggested_questions,
                'intent': intent,
                'data': sidebar_data
            })
            # ───────────────────────────────────────────────────────────────────

        except Exception as e:
            logger.error(f"Error in send_message_public: {e}")
            return jsonify({
                'status': 'error',
                'ai_response': {
                    'text': "I'm here to help with your career! Please ask me about career paths, skills, jobs in Pakistan, or scholarships.",
                    'timestamp': datetime.now().isoformat()
                },
                'suggested_questions': [
                    "What career path should I follow?",
                    "What skills are in demand?",
                    "How to prepare for interviews?",
                    "Show me job opportunities"
                ],
                'intent': '',
                'data': {}
            })

    @staticmethod
    def get_history_public():
        """Get chat history - PUBLIC"""
        try:
            session_id = request.headers.get('X-Session-Id', 'anonymous')
            messages = anonymous_chats.get(session_id, [])

            formatted_messages = []
            for msg in messages[-50:]:
                formatted_messages.append({
                    'id': hash(str(msg)),
                    'sender': msg['sender'],
                    'text': msg['message'],
                    'timestamp': msg['timestamp'],
                    'time': datetime.fromisoformat(msg['timestamp']).strftime('%I:%M %p')
                })

            if not formatted_messages:
                return jsonify({
                    'messages': [{
                        'id': 1,
                        'sender': 'ai',
                        'text': "👋 Hi! I'm your AI Career Coach. How can I help with your career today?",
                        'timestamp': datetime.now().isoformat(),
                        'time': datetime.now().strftime('%I:%M %p')
                    }],
                    'suggested_questions': [
                        "What career path should I follow?",
                        "What skills should I learn?",
                        "How to prepare for interviews?",
                        "What's the salary range for my role?",
                        "Show me job opportunities",
                        "Tell me about scholarships"
                    ]
                })

            return jsonify({
                'messages': formatted_messages,
                'suggested_questions': [
                    "What career path should I follow?",
                    "What skills should I learn?",
                    "How to prepare for interviews?",
                    "What's the salary range for my role?"
                ]
            })

        except Exception as e:
            logger.error(f"Error in get_history_public: {e}")
            return jsonify({
                'messages': [{
                    'id': 1,
                    'sender': 'ai',
                    'text': "👋 Hi! I'm your AI Career Coach. How can I help with your career today?",
                    'timestamp': datetime.now().isoformat(),
                    'time': datetime.now().strftime('%I:%M %p')
                }],
                'suggested_questions': []
            })

    @staticmethod
    def clear_history_public():
        """Clear chat history - PUBLIC"""
        try:
            session_id = request.headers.get('X-Session-Id', 'anonymous')
            if session_id in anonymous_chats:
                anonymous_chats[session_id] = []
            return jsonify({'message': 'Chat history cleared successfully'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
