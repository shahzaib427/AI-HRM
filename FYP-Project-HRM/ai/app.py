"""
Main Flask Application
"""
import os

# ── FIX: Load .env from the ai/ directory (same folder as this file) ─────────
# Using __file__ ensures it finds the .env regardless of where you run the
# server from (e.g. running `python ai/app.py` from the project root).
from dotenv import load_dotenv
_env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=_env_file, override=True)

# Quick sanity-check log so you can confirm vars loaded on startup
import logging
logging.basicConfig(level=logging.INFO)
_startup_logger = logging.getLogger('startup')
_startup_logger.info(f"📧 EMAIL_USER  = {os.environ.get('EMAIL_USER', '❌ NOT SET')}")
_startup_logger.info(f"📧 EMAIL_PASS  = {'✅ set' if os.environ.get('EMAIL_PASS') else '❌ NOT SET'}")
_startup_logger.info(f"📧 EMAIL_HOST  = {os.environ.get('EMAIL_HOST', 'smtp.gmail.com (default)')}")
# ─────────────────────────────────────────────────────────────────────────────


from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
from routes.career_chat_routes import career_chat_bp
from datetime import datetime, timedelta
import json
import threading
from queue import Queue, Empty

from config.config import Config
from models import db
from routes import register_blueprints
from services.ai_service import AIService
from routes.face_routes import face_bp
 
from routes.ats_routes import ats_bp
# ------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# App factory
# ------------------------------------------------------------------
app = Flask(__name__)
app.config.from_object(Config)

# JWT config
app.config['JWT_SECRET_KEY']          = os.environ.get('JWT_SECRET_KEY', 'change-this-in-production')
app.config['JWT_TOKEN_LOCATION']      = ['headers', 'query_string']
app.config['JWT_QUERY_STRING_NAME']   = 'token'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_HEADER_NAME']         = 'Authorization'
app.config['JWT_HEADER_TYPE']         = 'Bearer'

jwt = JWTManager(app)
db.init_app(app)

CORS(app,
     origins=["http://localhost:5173", "http://localhost:5174"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-User-Id"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# ------------------------------------------------------------------
# FIX 1 & 2: Single shared stream registry used by BOTH app.py and
# wellness_routes.py.
# ------------------------------------------------------------------
from routes.wellness_routes import (
    UserStream,
    get_stream,
    remove_stream,
    broadcast_to_user,
    broadcast_to_all,
    _streams as active_streams,
    _streams_lock as streams_lock
)

app.active_streams = active_streams

# ------------------------------------------------------------------
# Register blueprints
# ------------------------------------------------------------------
register_blueprints(app)
app.register_blueprint(career_chat_bp, url_prefix='/api/career-chat')
app.register_blueprint(ats_bp)
app.register_blueprint(face_bp)   

# ------------------------------------------------------------------
# Create DB tables on first app context
from models.ats import ATSAnalysis
# ------------------------------------------------------------------
with app.app_context():
    db.create_all()
    logger.info("✅ Database tables created/verified")

# ------------------------------------------------------------------
# SSE stream endpoint
# ------------------------------------------------------------------
@app.route("/api/stream/<string:user_id>", methods=["GET"])
def stream_updates(user_id: str):
    """Server-Sent Events endpoint for real-time updates"""

    def generate():
        stream = get_stream(user_id)
        yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id, 'timestamp': datetime.now().isoformat()})}\n\n"

        try:
            while stream.active:
                try:
                    data = stream.queue.get(timeout=25)
                    yield f"data: {json.dumps(data)}\n\n"
                except Empty:
                    stream.last_ping = datetime.now()
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
        except GeneratorExit:
            logger.info(f"User {user_id} disconnected from stream")
            stream.close()
            remove_stream(user_id)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control':      'no-cache',
            'X-Accel-Buffering':  'no',
            'Connection':         'keep-alive',
            'Content-Type':       'text/event-stream'
        }
    )

# ------------------------------------------------------------------
# Pre-load HR (boat) module
# ------------------------------------------------------------------
print("\n" + "=" * 70)
print("🚀 PRE-LOADING HR MODULE...")
print("=" * 70)

try:
    from boat.boat_module import predict as boat_predict
    from boat.boat_module import get_document_stats

    status = boat_predict({'action': 'status'})
    print("✅ HR Module loaded successfully!")
    print(f"📚 Knowledge base size: {status.get('data', {}).get('knowledge_base_size', 0)} chunks")

    app.config['BOAT_PREDICT'] = boat_predict
    app.config['BOAT_STATS']   = get_document_stats

except Exception as e:
    print(f"❌ Error loading HR module: {e}")
    app.config['BOAT_PREDICT'] = None

print("=" * 70 + "\n")

# ------------------------------------------------------------------
# Chat endpoint (public)
# ------------------------------------------------------------------
 
@app.route("/api/chat/send", methods=["POST"])
@app.route("/chat", methods=["POST"])           # keep old route working too
def chat():
    try:
        data    = request.json or {}
        message = data.get('message', '').strip()
 
        if not message:
            return jsonify({'answer': "Please type a message.", 'status': 'error',
                            'timestamp': datetime.now().isoformat()}), 400
 
        boat_predict = app.config.get('BOAT_PREDICT')
        if boat_predict is None:
            return jsonify({'answer': "HR system is initializing. Please try again.",
                            'status': 'error', 'timestamp': datetime.now().isoformat()}), 503
 
        # ── NEW: Read JWT token from Authorization header ─────────────────────
        # React sends: headers: { Authorization: "Bearer <token>" }
        # We forward it to boat_predict so it can call MERN APIs on behalf of user
        auth_header = request.headers.get("Authorization", "")
        jwt_token   = auth_header if auth_header.startswith("Bearer ") else None
        # ─────────────────────────────────────────────────────────────────────
 
        # ── MODIFIED: pass jwt_token in the data dict ─────────────────────────
        result = boat_predict({
            'action':    'ask',
            'question':  message,
            'jwt_token': jwt_token      # ← NEW: was not here before
        })
        # ─────────────────────────────────────────────────────────────────────
 
        answer = result.get('answer') or "I couldn't find an answer. Please try rephrasing."
 
        return jsonify({
            'answer':    answer,
            'status':   'success',
            'timestamp': datetime.now().isoformat(),
            # Optional: tell frontend what the bot used to answer
            'session_id': data.get('session_id', '')
        })
 
    except Exception as e:
        logger.exception("Chat endpoint failed")
        return jsonify({'error': 'Internal server error', 'status': 'error'}), 500
 
# ------------------------------------------------------------------
# Test endpoints
# ------------------------------------------------------------------
@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({'status': 'success', 'message': 'CORS is working!',
                    'timestamp': datetime.now().isoformat()})


@app.route("/api/test-broadcast", methods=["POST"])
@jwt_required(locations=['headers', 'query_string'])
def test_broadcast():
    user_id = get_jwt_identity()
    data    = request.get_json() or {}
    message = data.get('message', 'Test broadcast')

    broadcast_to_all({
        'type':      'test',
        'message':   message,
        'from_user': user_id,
        'timestamp': datetime.now().isoformat()
    })

    with streams_lock:
        count = len(active_streams)

    return jsonify({'status': 'success', 'message': 'Broadcast sent',
                    'connected_users': count})

# ------------------------------------------------------------------
# Stream status
# ------------------------------------------------------------------
@app.route("/api/stream/status", methods=["GET"])
@jwt_required(locations=['headers', 'query_string'])
def stream_status():
    user_id = str(get_jwt_identity())
    with streams_lock:
        count        = len(active_streams)
        is_connected = user_id in active_streams

    return jsonify({
        'is_connected':       is_connected,
        'active_connections': count,
        'timestamp':          datetime.now().isoformat()
    })

# ------------------------------------------------------------------
# Debug auth
# ------------------------------------------------------------------
@app.route("/api/debug/auth", methods=["GET"])
@jwt_required(locations=['headers', 'query_string'], optional=True)
def debug_auth():
    user_id = get_jwt_identity()
    if user_id:
        return jsonify({'authenticated': True, 'user_id': user_id})
    return jsonify({'authenticated': False, 'error': 'No valid token provided'}), 401

# ------------------------------------------------------------------
# Debug HR endpoint
# ------------------------------------------------------------------
@app.route("/debug/hr", methods=["GET"])
def debug_hr():
    try:
        boat_predict = app.config.get('BOAT_PREDICT')
        if boat_predict is None:
            return jsonify({'error': 'HR module not loaded'}), 503

        status = boat_predict({'action': 'status'})
        results = {q: boat_predict({'action': 'ask', 'question': q}).get('answer')
                   for q in ["hi", "where do i mark my attendance"]}

        return jsonify({'status': 'success', 'knowledge_base': status.get('data', {}),
                        'test_results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------
# Error handlers
# ------------------------------------------------------------------
@app.errorhandler(404)
def not_found(error):
    return jsonify({'status': 'error', 'message': 'Route not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health_check():
    with streams_lock:
        count = len(active_streams)
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat(),
                    'active_streams': count})

# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🚀 AI Career Coach System - Backend Server")
    print("=" * 70)
    print("✅ CORS configured for: http://localhost:5173, :5174")
    print("✅ JWT configured (read from JWT_SECRET_KEY env var)")
    print("✅ Real-time streaming enabled")
    print(f"✅ Email: {os.environ.get('EMAIL_USER', '❌ NOT CONFIGURED')}")
    print("\n📡 Stream endpoint:  GET /api/stream/<user_id>")
    print("📡 Health check:     GET /health")
    print("📡 Chat:             POST /chat")
    print("\n🌐 Server: http://localhost:5001")
    print("=" * 70 + "\n")

    app.run(port=5001, debug=True, threaded=True,use_reloader=False)