"""
Wellness Routes - No JWT, no login. User ID from X-User-Id header or query param.
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context, g
from functools import wraps
import logging
import json
import threading
from datetime import datetime
from queue import Queue, Empty

from services.wellness_service import WellnessService
from services.ai_service import AIService

logger = logging.getLogger(__name__)
wellness_bp = Blueprint('wellness', __name__, url_prefix='/api')

# ------------------------------------------------------------------
# Service singleton
# ------------------------------------------------------------------
_service_instance = None
_service_lock = threading.Lock()


def get_service() -> WellnessService:
    global _service_instance
    if _service_instance is None:
        with _service_lock:
            if _service_instance is None:
                _service_instance = WellnessService(AIService())
    return _service_instance


# ------------------------------------------------------------------
# SSE stream registry
# ------------------------------------------------------------------
_streams: dict = {}
_streams_lock = threading.Lock()


class UserStream:
    def __init__(self, user_id):
        self.user_id   = user_id
        self.queue     = Queue()
        self.active    = True
        self.last_ping = datetime.now()

    def send(self, data):
        if self.active:
            try:
                self.queue.put(data)
                return True
            except Exception:
                return False
        return False

    def close(self):
        self.active = False


def get_stream(user_id: str) -> UserStream:
    with _streams_lock:
        if user_id not in _streams:
            _streams[user_id] = UserStream(user_id)
        return _streams[user_id]


def remove_stream(user_id: str):
    with _streams_lock:
        _streams.pop(user_id, None)


def broadcast_to_user(user_id: str, data: dict) -> bool:
    with _streams_lock:
        stream = _streams.get(str(user_id))
    if stream and stream.active:
        return stream.send(data)
    return False


def broadcast_to_all(data: dict) -> int:
    with _streams_lock:
        active = [s for s in _streams.values() if s.active]
    return sum(1 for s in active if s.send(data))


# ------------------------------------------------------------------
# Error handler — now surfaces the real error message in development
# ------------------------------------------------------------------
def handle_errors(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error in {f.__name__}: {e}")
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            # Log the full traceback so you can see the real cause
            logger.exception(f"Unhandled error in {f.__name__}: {e}")
            # Return the real error string — change to 'Internal server error'
            # in production if you want to hide internals
            return jsonify({'error': str(e)}), 500
    return decorated


# ------------------------------------------------------------------
# User ID helper — reads from header, query param, or JSON body
# Priority: X-User-Id header > ?user_id= > JSON body user_id
# ------------------------------------------------------------------
def get_user_id():
    uid = request.headers.get('X-User-Id')
    if not uid:
        uid = request.args.get('user_id')
    if not uid and request.method == 'POST':
        try:
            uid = (request.get_json(silent=True) or {}).get('user_id')
        except Exception:
            pass
    return str(uid).strip() if uid else None


def require_user(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Always allow pre-flight OPTIONS through without auth
        if request.method == 'OPTIONS':
            return '', 200
        uid = get_user_id()
        if not uid:
            return jsonify({'error': 'user_id required (send X-User-Id header or ?user_id=)'}), 401
        g.user_id = uid
        return f(*args, **kwargs)
    return decorated


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@wellness_bp.route('/debug/info', methods=['GET'])
def debug_info():
    return jsonify({
        'status':    'wellness_routes_working',
        'timestamp': datetime.now().isoformat()
    })


@wellness_bp.route('/stream', methods=['GET'])
@require_user
def stream_updates():
    user_id = g.user_id

    def generate():
        stream = get_stream(user_id)
        yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"
        try:
            while stream.active:
                try:
                    data = stream.queue.get(timeout=25)
                    yield f"data: {json.dumps(data)}\n\n"
                except Empty:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        except GeneratorExit:
            stream.close()
            remove_stream(user_id)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'}
    )


@wellness_bp.route('/checkin/status', methods=['GET', 'OPTIONS'])
@handle_errors
@require_user
def get_checkin_status():
    return jsonify(get_service().get_checkin_status(g.user_id))


@wellness_bp.route('/checkin', methods=['POST', 'OPTIONS'])
@handle_errors
@require_user
def create_checkin():
    data = request.get_json(silent=True) or {}

    required = ['mood', 'stress', 'sleep', 'energy', 'productivity']
    missing  = [k for k in required if k not in data]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    result = get_service().create_checkin(g.user_id, data)
    broadcast_to_user(g.user_id, {'type': 'new_checkin', 'data': result})
    broadcast_to_all({'type': 'activity', 'user_id': g.user_id, 'action': 'checkin'})
    return jsonify(result), 201


@wellness_bp.route('/weekly-wellness', methods=['GET', 'OPTIONS'])
@handle_errors
@require_user
def get_weekly_wellness():
    # Read the ?days= query param that the frontend sends (?days=7)
    try:
        days = int(request.args.get('days', 7))
    except (ValueError, TypeError):
        days = 7

    return jsonify(get_service().get_weekly_wellness(g.user_id, days))


@wellness_bp.route('/history', methods=['GET', 'OPTIONS'])
@handle_errors
@require_user
def get_history():
    try:
        limit = int(request.args.get('limit', 30))
    except (ValueError, TypeError):
        limit = 30

    return jsonify(get_service().get_wellness_history(g.user_id, limit))


@wellness_bp.route('/stats', methods=['GET', 'OPTIONS'])
@handle_errors
@require_user
def get_stats():
    return jsonify(get_service().get_user_stats(g.user_id))


@wellness_bp.route('/insights', methods=['GET', 'OPTIONS'])
@handle_errors
@require_user
def get_insights():
    return jsonify(get_service().get_insights(g.user_id))


@wellness_bp.route('/chat/send', methods=['POST', 'OPTIONS'])
@handle_errors
@require_user
def chat_send():
    data    = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'Message required'}), 400

    coach     = get_service().coach
    emotion   = coach.analyze_emotion(message).get('label', 'neutral')
    sentiment = coach.analyze_sentiment(message).get('label', 'NEUTRAL')

    tone_map = {
        'stress':  "I can see you're feeling stressed. Try taking 3 deep breaths.",
        'sadness': "I hear that you're feeling down. I'm here to help.",
        'anger':   "It sounds like you're frustrated. A short walk might help.",
        'joy':     "That's wonderful! Keep that positive energy going.",
        'fear':    "It's okay to feel nervous. Let's take it one step at a time.",
        'love':    "That warmth is great for your wellbeing.",
        'neutral': "Thanks for sharing. How can I support your wellness today?"
    }

    return jsonify({
        'response':  tone_map.get(emotion, tone_map['neutral']),
        'emotion':   emotion,
        'sentiment': sentiment,
        'timestamp': datetime.now().isoformat()
    })


@wellness_bp.route('/stream/status', methods=['GET'])
@handle_errors
def stream_status():
    with _streams_lock:
        count = len(_streams)
    return jsonify({'connected': True, 'active_connections': count})



@wellness_bp.route('/debug/test-user', methods=['GET'])
def debug_test_user():
    import traceback
    user_id = request.args.get('user_id')
    try:
        from models.wellness import WellnessCheckin
        result = WellnessCheckin.get_today_checkins(user_id)
        return jsonify({'ok': True, 'result': str(result)})
    except Exception as e:
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500