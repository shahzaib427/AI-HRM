# routes/auth_routes.py
from flask import Blueprint
from controllers.auth_controller import AuthController

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    return AuthController.register()

@auth_bp.route('/login', methods=['POST'])
def login():
    return AuthController.login()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return AuthController.logout()

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    return AuthController.check_auth()