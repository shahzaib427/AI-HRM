# middleware/auth_middleware.py

from functools import wraps
from flask import request, jsonify
import jwt

SECRET_KEY = "your_secret_key"  # MUST match Node.js

def login_required(f):
    """JWT-based authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Token required'}), 401

        try:
            # Extract token from "Bearer <token>"
            token = auth_header.split(" ")[1]

            # Decode JWT
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

            # Attach user to request
            request.user = decoded

        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)

    return decorated_function


def get_current_user():
    """Get current user from JWT"""
    return getattr(request, 'user', None)