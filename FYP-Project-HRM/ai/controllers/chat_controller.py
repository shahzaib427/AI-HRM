# controllers/chat_controller.py (RAG version)
from flask import session, jsonify, request
from datetime import datetime
from models.chat import ChatMessage
from services.ai_service import AIService

class ChatController:
    
    @staticmethod
    def send_message():
        """Send a chat message (HR Assistant RAG)"""
        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'error': 'Not authenticated'}), 401
            
            data = request.json
            message = data.get('message')
            
            if not message:
                return jsonify({'error': 'No message provided'}), 400
            
            from models import db
            
            # Save user message
            user_message = ChatMessage(
                user_id=user_id,
                sender='user',
                message=message
            )
            db.session.add(user_message)
            db.session.commit()
            
            # --- CALL RAG BASED HR ASSISTANT ---
            result = AIService.chat_hr(message)
            
            # RAG output usually has 'answer' key
            answer = result.get('answer', 'Sorry, I could not find an answer in the HR docs.')
            
            # Save AI response
            ai_message = ChatMessage(
                user_id=user_id,
                sender='ai',
                message=answer
            )
            db.session.add(ai_message)
            db.session.commit()
            
            return jsonify({
                'ai_response': {
                    'text': answer,
                    'timestamp': datetime.now().isoformat()
                }
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500