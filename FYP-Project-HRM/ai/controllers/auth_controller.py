# controllers/auth_controller.py
from flask import session, jsonify, request
from models.user import User
from models.profile import UserProfile
import json

class AuthController:
    
    @staticmethod
    def register():
        """Register a new user"""
        try:
            data = request.json
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            education_level = data.get('education_level', 'Bachelor\'s')
            
            if not username or not email or not password:
                return jsonify({'error': 'Username, email, and password required'}), 400
            
            # Check if user exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({'error': 'Email already registered'}), 400
            
            # Create new user
            user = User(username=username, email=email)
            user.set_password(password)
            
            from models import db
            db.session.add(user)
            db.session.commit()
            
            # Create default profile
            profile = UserProfile(
                user_id=user.id,
                current_role='Software Engineer',
                experience_years=0,
                education_level=education_level,
                skills=json.dumps(['Python', 'JavaScript']),
                interests=json.dumps(['AI/ML', 'Web Development']),
                career_goal='Senior Software Engineer',
                timeline='2 years',
                location='Lahore'
            )
            db.session.add(profile)
            db.session.commit()
            
            # Store in session
            session.clear()
            session['user_id'] = user.id
            session['username'] = username
            session.permanent = True
            
            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'profile': profile.to_dict()
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    def login():
        """Login user"""
        try:
            data = request.json
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({'error': 'Email and password required'}), 400
            
            user = User.query.filter_by(email=email).first()
            
            if not user or not user.check_password(password):
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Store in session
            session.clear()
            session['user_id'] = user.id
            session['username'] = user.username
            session.permanent = True
            
            # Get profile
            profile = UserProfile.query.filter_by(user_id=user.id).first()
            
            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'profile': profile.to_dict() if profile else None
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    def logout():
        """Logout user"""
        try:
            session.clear()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    def check_auth():
        """Check if user is authenticated"""
        try:
            user_id = session.get('user_id')
            if user_id:
                user = User.query.get(user_id)
                if user:
                    profile = UserProfile.query.filter_by(user_id=user.id).first()
                    return jsonify({
                        'authenticated': True,
                        'user': user.to_dict(),
                        'profile': profile.to_dict() if profile else None
                    })
            
            return jsonify({'authenticated': False})
            
        except Exception as e:
            return jsonify({'authenticated': False}), 200