import os
from datetime import timedelta


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # ── Database ──────────────────────────────────────────────────
    # Render's Postgres gives a URL starting with "postgres://", but
    # SQLAlchemy 1.4+/2.x requires "postgresql://". Rewrite it if needed.
    # Falls back to local SQLite only when DATABASE_URL isn't set (local dev).
    _db_url = os.environ.get('DATABASE_URL', 'sqlite:///career_coach.db')
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,   # test each connection before using it; reconnects automatically if it's dead
        'pool_recycle': 280,     # recycle connections every ~4.5 min, before Render's idle-timeout can kill them
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-super-secret-key-change-this-in-production-2024')
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Productivity Goals
    DAILY_FOCUS_GOAL_MINUTES = 240    # 4 hours
    WEEKLY_FOCUS_GOAL_MINUTES = 1200  # 20 hours