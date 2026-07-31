# controllers/chat_controller.py
from flask import jsonify, request
from datetime import datetime
from models.chat import ChatMessage
from services.ai_service import AIService
from models import db
import uuid


class ChatController:

    @staticmethod
    def send_message():
        try:
            data       = request.get_json() or {}
            message    = data.get('message', '').strip()
            user_name  = data.get('user_name', 'anonymous')
            session_id = data.get('session_id') or str(uuid.uuid4())

            if not message:
                return jsonify({'error': 'No message provided'}), 400

            # Save user message — no user_id needed
            db.session.add(ChatMessage(
                user_id=None,
                session_id=session_id,
                sender='user',
                message=message,
                chat_type='hr'
            ))
            db.session.commit()

            # Call RAG HR assistant
            result = AIService.chat_hr(message)
            answer = result.get('answer', 'Sorry, I could not find an answer in the HR docs.')

            # Save AI response
            db.session.add(ChatMessage(
                user_id=None,
                session_id=session_id,
                sender='ai',
                message=answer,
                chat_type='hr'
            ))
            db.session.commit()

            return jsonify({
                'answer':     answer,
                'session_id': session_id,
                'timestamp':  datetime.now().isoformat()
            })

        except Exception as e:
            db.session.rollback()
            print(f"[chat_controller] ERROR: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_history():
        try:
            session_id = request.args.get('session_id')
            if not session_id:
                return jsonify({'messages': []})

            messages = (
                ChatMessage.query
                .filter_by(session_id=session_id)
                .order_by(ChatMessage.id.asc())
                .all()
            )
            return jsonify({'messages': [m.to_dict() for m in messages]})

        except Exception as e:
            return jsonify({'error': str(e)}), 500