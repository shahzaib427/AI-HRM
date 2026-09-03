"""
Main Flask Application
"""

import os
import json
import threading
import logging

from queue import Empty
from datetime import datetime, timedelta

# ── Load .env from the ai/ directory ──────────────────────────────
from dotenv import load_dotenv

_env_file = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    ".env"
)

load_dotenv(dotenv_path=_env_file, override=True)


# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)

_startup_logger = logging.getLogger("startup")

_startup_logger.info(
    f"📧 EMAIL_USER = {os.environ.get('EMAIL_USER', '❌ NOT SET')}"
)

_startup_logger.info(
    f"📧 EMAIL_PASS = {'✅ set' if os.environ.get('EMAIL_PASS') else '❌ NOT SET'}"
)

_startup_logger.info(
    f"📧 EMAIL_HOST = {os.environ.get('EMAIL_HOST', 'smtp.gmail.com')}"
)


# ── Flask imports ─────────────────────────────────────────────────
from flask import (
    Flask,
    jsonify,
    request,
    Response,
    stream_with_context
)

from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    get_jwt_identity,
    jwt_required
)

from config.config import Config
from models import db

from routes import register_blueprints
from routes.career_chat_routes import career_chat_bp
# Also import _get_face_app so we can warm it up in a background
# thread at startup (same pattern as boat_module below).
from routes.face_routes import face_bp, _get_face_app
from routes.ats_routes import ats_bp


# ── Logging ───────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


# ── Create Flask app ──────────────────────────────────────────────
app = Flask(__name__)

app.config.from_object(Config)


# ── JWT Configuration ─────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY",
    "change-this-in-production"
)

app.config["JWT_TOKEN_LOCATION"] = [
    "headers",
    "query_string"
]

app.config["JWT_QUERY_STRING_NAME"] = "token"

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

app.config["JWT_HEADER_NAME"] = "Authorization"

app.config["JWT_HEADER_TYPE"] = "Bearer"


# ── Initialize extensions ─────────────────────────────────────────
jwt = JWTManager(app)

db.init_app(app)


# ── CORS ──────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────
# Allowed origins come from an env var (ALLOWED_ORIGINS, comma-
# separated) instead of being hardcoded to localhost only.
# On Render, set:
#   ALLOWED_ORIGINS = https://ai-nine-amber.vercel.app,http://localhost:5173,http://localhost:5174
#
# ⚠️ IMPORTANT: don't reintroduce a hardcoded origins=[...] list here
# again — that's what silently undid this fix last time. Any future
# edits to this file should keep reading from ALLOWED_ORIGINS.
#
# If ALLOWED_ORIGINS isn't set, we fall back to the local dev origins
# only, so nothing breaks if you forget to set it — it'll just fail
# the same way it did before, in dev only.
# ─────────────────────────────────────────────────────────────────
_default_origins = "http://localhost:5173,http://localhost:5174"

_allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

_startup_logger.info(f"🌐 CORS allowed origins = {_allowed_origins}")

CORS(
    app,
    origins=_allowed_origins,
    supports_credentials=True,
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-User-Id"
    ],
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ]
)


# ── Wellness streams ──────────────────────────────────────────────
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


# ── Register Blueprints ───────────────────────────────────────────
register_blueprints(app)

app.register_blueprint(
    career_chat_bp,
    url_prefix="/api/career-chat"
)

app.register_blueprint(ats_bp)

app.register_blueprint(face_bp)


# ── Database tables ───────────────────────────────────────────────
try:
    from models.ats import ATSAnalysis

    with app.app_context():
        db.create_all()

    logger.info("✅ Database tables created/verified")

except Exception as e:
    logger.exception(f"❌ Database initialization failed: {e}")


# ================================================================
# LAZY LOAD HR / BOAT AI MODULE
# ================================================================

# IMPORTANT:
# Do NOT import boat.boat_module during Render startup.
# Heavy AI models will load only when the chat endpoint is used,
# OR via the background warm-up thread started right below —
# whichever happens first. Both share the same lock, so there's
# no double-loading.

app.config["BOAT_PREDICT"] = None
app.config["BOAT_STATS"] = None

_boat_lock = threading.Lock()


def get_boat_predict():
    """
    Load HR AI module only when it is actually needed
    (or pre-warmed in the background — see _warmup_boat_module below).
    """

    if app.config.get("BOAT_PREDICT") is None:

        with _boat_lock:

            # Double check after acquiring lock
            if app.config.get("BOAT_PREDICT") is None:

                logger.info("🚀 Loading HR AI module...")

                try:

                    from boat.boat_module import (
                        predict as boat_predict,
                        get_document_stats
                    )

                    app.config["BOAT_PREDICT"] = boat_predict

                    app.config["BOAT_STATS"] = get_document_stats

                    logger.info("✅ HR AI module loaded successfully!")

                except Exception as e:

                    logger.exception(
                        f"❌ Failed to load HR AI module: {e}"
                    )

                    raise

    return app.config["BOAT_PREDICT"]


# ================================================================
# BACKGROUND WARM-UP — HR / BOAT MODULE
# ================================================================
# WHY: Render's proxy has its own request timeout, shorter than
# gunicorn's --timeout 300. If the FIRST /chat request has to load
# torch + SentenceTransformer + T5 from scratch (30-60s+), Render's
# proxy kills the connection with a 502 Bad Gateway before the
# backend even finishes responding.
#
# FIX: warm up the model in a background thread right after the
# app finishes booting (port is already bound by then, so Render's
# startup port-scan passes immediately, same as before). By the
# time a real user sends a chat message, the model is already
# loaded and get_boat_predict() returns instantly.
#
# This thread shares _boat_lock with get_boat_predict(), so if a
# real request happens to arrive before warm-up finishes, it will
# just wait on the same lock rather than triggering a second,
# redundant load.

def _warmup_boat_module():
    try:
        logger.info("🔥 Warming up HR AI module in background...")
        get_boat_predict()
        logger.info("🔥 HR AI module warm-up complete!")
    except Exception as e:
        logger.exception(f"🔥 HR AI module warm-up failed: {e}")


threading.Thread(target=_warmup_boat_module, daemon=True).start()


# ================================================================
# BACKGROUND WARM-UP — FACE RECOGNITION MODEL
# ================================================================
# WHY: InsightFace's buffalo_sc model (see _get_face_app() in
# routes/face_routes.py) is lazy-loaded on first call. On Render,
# the first real check-in/checkout request after a cold start or
# idle spin-down has to pay the full model-load cost (downloading/
# reading weights + ONNX runtime init) synchronously inside that
# request. That's slow enough to:
#   - exceed Render's proxy timeout → 502 Bad Gateway, and/or
#   - cause the platform to throttle concurrent/retried requests
#     while the model is still loading → 429 Too Many Requests
#
# FIX: same pattern as _warmup_boat_module above — load the face
# model in a background thread immediately after boot, so it's
# already resident in memory before a real user hits /ai/face/verify.
#
# _get_face_app() has its own internal "already loaded" check
# (via the module-level _face_app global in face_routes.py), so a
# real request arriving before warm-up finishes will simply load it
# once, not twice.

def _warmup_face_model():
    try:
        logger.info("🔥 Warming up face recognition model in background...")
        _get_face_app()
        logger.info("🔥 Face recognition model warm-up complete!")
    except Exception as e:
        logger.exception(f"🔥 Face model warm-up failed: {e}")


threading.Thread(target=_warmup_face_model, daemon=True).start()


# ================================================================
# HEALTH CHECK
# IMPORTANT: This should respond immediately
# ================================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "message": "AI HRM Backend is running"
    })


@app.route("/health", methods=["GET"])
def health_check():

    with streams_lock:
        count = len(active_streams)

    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_streams": count,
        "boat_ready": app.config.get("BOAT_PREDICT") is not None
    })


# ================================================================
# SERVER-SENT EVENTS
# ================================================================

@app.route("/api/stream/<string:user_id>", methods=["GET"])
def stream_updates(user_id: str):

    def generate():
        stream = get_stream(user_id)

        connected_data = {
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }

        yield f"data: {json.dumps(connected_data)}\n\n"

        try:
            while stream.active:
                try:
                    data = stream.queue.get(timeout=25)

                    yield f"data: {json.dumps(data)}\n\n"

                except Empty:
                    stream.last_ping = datetime.now()

                    heartbeat_data = {
                        "type": "heartbeat",
                        "timestamp": datetime.now().isoformat()
                    }

                    yield f"data: {json.dumps(heartbeat_data)}\n\n"

        except GeneratorExit:
            logger.info(
                f"User {user_id} disconnected from stream"
            )

            stream.close()
            remove_stream(user_id)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

# ================================================================
# CHAT ENDPOINT
# ================================================================

@app.route("/api/chat/send", methods=["POST"])
@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.json or {}

        message = data.get(
            "message",
            ""
        ).strip()

        if not message:

            return jsonify({
                "answer": "Please type a message.",
                "status": "error",
                "timestamp": datetime.now().isoformat()
            }), 400


        # Lazy-load AI only here (usually already warm by this point)
        boat_predict = get_boat_predict()


        # Read JWT token
        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        jwt_token = (
            auth_header
            if auth_header.startswith("Bearer ")
            else None
        )


        # Ask HR AI
        result = boat_predict({

            "action": "ask",

            "question": message,

            "jwt_token": jwt_token

        })


        answer = (
            result.get("answer")
            or
            "I couldn't find an answer. Please try rephrasing."
        )


        return jsonify({

            "answer": answer,

            "status": "success",

            "timestamp": datetime.now().isoformat(),

            "session_id": data.get(
                "session_id",
                ""
            )

        })


    except Exception as e:

        logger.exception(
            "Chat endpoint failed"
        )

        return jsonify({

            "error": "Internal server error",

            "status": "error"

        }), 500


# ================================================================
# TEST ENDPOINT
# ================================================================

@app.route("/api/test", methods=["GET"])
def test():

    return jsonify({

        "status": "success",

        "message": "CORS is working!",

        "timestamp": datetime.now().isoformat()

    })


# ================================================================
# TEST BROADCAST
# ================================================================

@app.route(
    "/api/test-broadcast",
    methods=["POST"]
)

@jwt_required(
    locations=[
        "headers",
        "query_string"
    ]
)

def test_broadcast():

    user_id = get_jwt_identity()

    data = request.get_json() or {}

    message = data.get(
        "message",
        "Test broadcast"
    )


    broadcast_to_all({

        "type": "test",

        "message": message,

        "from_user": user_id,

        "timestamp": datetime.now().isoformat()

    })


    with streams_lock:

        count = len(active_streams)


    return jsonify({

        "status": "success",

        "message": "Broadcast sent",

        "connected_users": count

    })


# ================================================================
# STREAM STATUS
# ================================================================

@app.route(
    "/api/stream/status",
    methods=["GET"]
)

@jwt_required(
    locations=[
        "headers",
        "query_string"
    ]
)

def stream_status():

    user_id = str(
        get_jwt_identity()
    )


    with streams_lock:

        count = len(active_streams)

        is_connected = (
            user_id in active_streams
        )


    return jsonify({

        "is_connected": is_connected,

        "active_connections": count,

        "timestamp": datetime.now().isoformat()

    })


# ================================================================
# DEBUG AUTH
# ================================================================

@app.route(
    "/api/debug/auth",
    methods=["GET"]
)

@jwt_required(
    locations=[
        "headers",
        "query_string"
    ],
    optional=True
)

def debug_auth():

    user_id = get_jwt_identity()

    if user_id:

        return jsonify({

            "authenticated": True,

            "user_id": user_id

        })


    return jsonify({

        "authenticated": False,

        "error": "No valid token provided"

    }), 401


# ================================================================
# DEBUG HR
# ================================================================

@app.route(
    "/debug/hr",
    methods=["GET"]
)

def debug_hr():

    try:

        boat_predict = get_boat_predict()


        status = boat_predict({

            "action": "status"

        })


        results = {

            q: boat_predict({

                "action": "ask",

                "question": q

            }).get("answer")

            for q in [

                "hi",

                "where do i mark my attendance"

            ]

        }


        return jsonify({

            "status": "success",

            "knowledge_base": status.get(
                "data",
                {}
            ),

            "test_results": results

        })


    except Exception as e:

        logger.exception(
            "Debug HR failed"
        )

        return jsonify({

            "error": str(e)

        }), 500


# ================================================================
# ERROR HANDLERS
# ================================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "status": "error",

        "message": "Route not found"

    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({

        "status": "error",

        "message": "Internal server error"

    }), 500


# ================================================================
# LOCAL ENTRY POINT
# ================================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)

    print(
        "🚀 AI Career Coach System - Backend Server"
    )

    print("=" * 70)

    print("📡 Health check: GET /health")

    print("📡 Chat: POST /chat")

    print("=" * 70 + "\n")


    app.run(

        host="0.0.0.0",

        port=int(
            os.environ.get(
                "PORT",
                5001
            )
        ),

        debug=True,

        threaded=True,

        use_reloader=False
    )