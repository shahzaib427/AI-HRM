# routes/__init__.py
from routes.auth_routes import auth_bp
from routes.profile_routes import profile_bp
from routes.career_routes import career_bp
from routes.chat_routes import chat_bp
from routes.wellness_routes import wellness_bp
from routes.learning_routes import learning_bp          # ← add this

def register_blueprints(app):
    """Register all blueprints with the app"""
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profile_bp, url_prefix='/api')
    app.register_blueprint(career_bp, url_prefix='/api/career')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(wellness_bp, url_prefix='/api')
    app.register_blueprint(learning_bp, url_prefix='/api')  # ← add this