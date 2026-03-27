# ai/app.py - Fixed CORS configuration
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import logging
import os
import sys
import uuid
from datetime import datetime, timedelta

# Add the parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all module predict functions
from ai_learning.ai_learning_module import predict as ai_learning_predict
from ai_productivity.ai_productivity_module import predict as ai_productivity_predict, init_app as init_productivity_db
from ai_career_coach.ai_career_coach_module import predict as ai_career_predict
from wellness.wellness_module import predict as wellness_predict, WellnessInput, WellnessCoach
from boat.boat_module import predict as boat_predict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app FIRST
app = Flask(__name__)

# Configure app for sessions
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here-for-development')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS

# Configure CORS - FIXED VERSION
CORS(app, 
     origins=["http://localhost:5173", "http://127.0.0.1:5173"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     expose_headers=["Content-Type", "Authorization"])

# Database configuration for productivity module
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///productivity.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize productivity module database
try:
    init_productivity_db(app)
    logger.info("✅ Productivity module initialized")
except Exception as e:
    logger.warning(f"⚠️ Could not initialize productivity DB: {e}")

# Helper function for CORS preflight - FIXED VERSION
def _build_cors_preflight_response():
    """Build CORS preflight response with specific origin"""
    response = jsonify({'status': 'ok'})
    # IMPORTANT: Use specific origin, not '*', when credentials are enabled
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# ============= WELLNESS API ROUTES =============

@app.route("/api/user/login", methods=["POST", "OPTIONS"])
def user_login():
    """Handle user login and session creation"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        username = data.get('username', '')
        employee_id = data.get('employee_id', '')
        
        if not username:
            username = f"User_{employee_id}" if employee_id else "Guest"
        
        # Store user info in session
        user_id = str(uuid.uuid4())
        session['user_id'] = user_id
        session['username'] = username
        
        logger.info(f"User logged in: {username} (ID: {user_id})")
        
        return jsonify({
            'success': True,
            'id': user_id,
            'username': username,
            'employee_id': employee_id,
            'is_new': True
        })
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/user/logout", methods=["POST", "OPTIONS"])
def user_logout():
    """Handle user logout"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        session.clear()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/check-session", methods=["GET", "OPTIONS"])
def check_session():
    """Check if user session is valid"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        logged_in = 'user_id' in session
        return jsonify({'logged_in': logged_in})
    except Exception as e:
        logger.error(f"Session check error: {e}")
        return jsonify({'logged_in': False}), 200

@app.route("/api/checkin/status", methods=["GET", "OPTIONS"])
def checkin_status():
    """Get user's check-in status for today"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Not logged in'}), 401
        
        # In production, fetch from database
        # For now, return default status
        return jsonify({
            'today_checkins': 0,
            'remaining': 2,
            'can_checkin': True,
            'checkin_number': 1,
            'daily_completed': False
        })
    except Exception as e:
        logger.error(f"Check-in status error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/checkin", methods=["POST", "OPTIONS"])
def submit_checkin():
    """Submit a daily check-in"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Not logged in'}), 401
        
        data = request.json
        logger.info(f"Check-in data received: {data}")
        
        # Create WellnessInput from data
        wellness_input = WellnessInput(
            mood=data.get('mood', 3),
            stress=data.get('stress', 5),
            sleep=data.get('sleep', 7),
            energy=data.get('energy', 5),
            productivity=data.get('productivity', 5),
            message=data.get('message', '')
        )
        
        # Get wellness analysis
        wellness_coach = WellnessCoach()
        result = wellness_coach.wellness_coach(wellness_input)
        
        # Return the response
        response_data = {
            'wellness_score': result['wellness_score'],
            'wellness_level': result['wellness_level'],
            'emotion': result.get('emotion', 'neutral'),
            'recommendations': result['recommendations'],
            'detailed_recommendations': result['detailed_recommendations'],
            'remaining_checkins': 1,
            'daily_completed': False,
            'checkin_number': 1,
            'daily_wellness': {'avg_wellness': result['wellness_score']}
        }
        
        logger.info(f"Check-in response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Check-in error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/weekly-wellness", methods=["GET", "OPTIONS"])
def weekly_wellness():
    """Get weekly wellness data"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        today = datetime.now()
        week_data = []
        
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            week_data.append({
                'day_name': day.strftime('%a'),
                'date': day.strftime('%Y-%m-%d'),
                'completed': i == 0,
                'checkins': 1 if i == 0 else 0,
                'wellness_score': 75 if i == 0 else None,
                'sleep': 7.5 if i == 0 else None
            })
        
        return jsonify({
            'streak': 0,
            'avg_weekly': 75,
            'total_checkins_week': 1,
            'completed_days': 1,
            'weekly_data': week_data
        })
    except Exception as e:
        logger.error(f"Weekly wellness error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/history", methods=["GET", "OPTIONS"])
def get_history():
    """Get user's check-in history"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Return mock history
        return jsonify({
            'checkins': []
        })
    except Exception as e:
        logger.error(f"History error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/stats", methods=["GET", "OPTIONS"])
def get_stats():
    """Get user's wellness statistics"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        return jsonify({
            'streak': 0,
            'total_days': 0,
            'total_checkins': 0,
            'averages': {
                'sleep': 0,
                'energy': 0,
                'stress': 0,
                'mood': 0
            }
        })
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return jsonify({'error': str(e)}), 500

# ============= CAREER COACH API ROUTES - UPDATED =============



@app.route("/api/profile", methods=["GET", "OPTIONS"])
def get_profile():
    """Get user profile for career coaching - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Return profile without requiring authentication
        profile = {
            'current_role': 'Software Engineer',
            'experience_years': 3,
            'skills': ['JavaScript', 'React', 'Python', 'Node.js', 'MongoDB', 'Express.js'],
            'interests': ['AI/ML', 'Cloud Computing', 'System Design', 'DevOps'],
            'career_goal': 'Tech Lead',
            'timeline': '2 years',
            'location': 'Lahore',
            'current_salary': 'Rs. 200,000',
            'username': 'Guest',
            'email': 'guest@example.com'
        }
        
        logger.info("Profile returned for guest user")
        return jsonify(profile)
        
    except Exception as e:
        logger.error(f"Profile error: {e}")
        # Return fallback profile
        return jsonify({
            'current_role': 'Software Engineer',
            'experience_years': 3,
            'skills': ['JavaScript', 'React', 'Python'],
            'interests': ['AI/ML', 'Cloud Computing'],
            'career_goal': 'Tech Lead',
            'timeline': '2 years',
            'location': 'Lahore',
            'current_salary': 'Rs. 200,000',
            'username': 'Guest',
            'email': 'guest@example.com'
        })

@app.route("/api/career/recommendations", methods=["GET", "OPTIONS"])
def get_career_recommendations():
    """Get career path recommendations - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Try to get recommendations from career coach module
        result = ai_career_predict({
            'action': 'get_recommendations',
            'user_id': 'guest'
        })
        
        # Check if we got a valid response with recommendations
        if result.get('status') == 'success':
            data = result.get('data', {})
            recommendations = data.get('recommendations', [])
            
            # Ensure recommendations is an array and has items
            if isinstance(recommendations, list) and len(recommendations) > 0:
                logger.info(f"Returning {len(recommendations)} recommendations from module")
                return jsonify({'recommendations': recommendations})
        
        # Return enhanced demo recommendations
        logger.info("Returning demo recommendations")
        demo_recommendations = [
            {
                'id': 1,
                'title': 'Senior Software Engineer',
                'description': 'Lead technical projects and mentor junior developers. Focus on system architecture and team leadership.',
                'confidence': 85,
                'timeline': '1-2 years',
                'steps': [
                    'Master system design patterns and architecture',
                    'Lead 2-3 major projects from planning to delivery',
                    'Get cloud certification (AWS/Azure)',
                    'Mentor 2-3 junior developers',
                    'Contribute to technical decision making'
                ],
                'salary_range': 'Rs. 350,000 - 500,000'
            },
            {
                'id': 2,
                'title': 'Tech Lead',
                'description': 'Lead development teams, drive technical architecture, and manage project delivery.',
                'confidence': 70,
                'timeline': '2-3 years',
                'steps': [
                    'Develop leadership and management skills',
                    'Learn Agile/Scrum project management',
                    'Contribute to open source projects',
                    'Build professional network in tech community',
                    'Take on cross-functional team projects'
                ],
                'salary_range': 'Rs. 500,000 - 800,000'
            },
            {
                'id': 3,
                'title': 'AI/ML Engineer',
                'description': 'Specialize in artificial intelligence and machine learning. Focus on building intelligent systems.',
                'confidence': 65,
                'timeline': '2-3 years',
                'steps': [
                    'Complete AI/ML specialization courses (Coursera/DeepLearning.ai)',
                    'Build ML portfolio projects (3-5 projects)',
                    'Master Python data science stack (NumPy, Pandas, Scikit-learn)',
                    'Get certified in TensorFlow or PyTorch',
                    'Participate in Kaggle competitions'
                ],
                'salary_range': 'Rs. 400,000 - 700,000'
            }
        ]
        
        return jsonify({'recommendations': demo_recommendations})
            
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        # Return demo recommendations on error
        demo_recommendations = [
            {
                'id': 1,
                'title': 'Senior Software Engineer',
                'description': 'Lead technical projects and mentor junior developers.',
                'confidence': 85,
                'timeline': '1-2 years',
                'steps': ['Master system design', 'Lead major projects', 'Get cloud certification'],
                'salary_range': 'Rs. 350,000 - 500,000'
            }
        ]
        return jsonify({'recommendations': demo_recommendations})

@app.route("/api/career/analyze-skill-gap", methods=["POST", "OPTIONS"])
def analyze_skill_gap():
    """Analyze skill gap for target role - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        target_role = data.get('target_role', 'Tech Lead')
        current_skills = data.get('skills', [])
        
        # Use career coach module
        result = ai_career_predict({
            'action': 'analyze_skill_gap',
            'target_role': target_role,
            'current_skills': current_skills
        })
        
        if result.get('status') == 'success':
            skill_gaps = result.get('data', {}).get('skill_gaps', [])
            if isinstance(skill_gaps, list) and len(skill_gaps) > 0:
                return jsonify({'skill_gaps': skill_gaps})
        
        # Return enhanced demo skill gap analysis
        demo_skill_gap = [
            {
                'skill': 'System Design',
                'current': 40,
                'target': 85,
                'importance': 'High',
                'gap': 45,
                'resources': ['Designing Data-Intensive Applications', 'System Design Interview by Alex Xu']
            },
            {
                'skill': 'Cloud Architecture (AWS/Azure)',
                'current': 30,
                'target': 80,
                'importance': 'High',
                'gap': 50,
                'resources': ['AWS Solutions Architect Certification', 'Cloud Design Patterns']
            },
            {
                'skill': 'Team Leadership',
                'current': 50,
                'target': 85,
                'importance': 'Medium',
                'gap': 35,
                'resources': ['Leadership courses on LinkedIn Learning', 'Mentorship programs']
            },
            {
                'skill': 'Project Management',
                'current': 45,
                'target': 75,
                'importance': 'Medium',
                'gap': 30,
                'resources': ['Agile/Scrum certification', 'PMP fundamentals course']
            },
            {
                'skill': 'Code Review & Best Practices',
                'current': 60,
                'target': 90,
                'importance': 'High',
                'gap': 30,
                'resources': ['Clean Code by Robert Martin', 'Code Review Best Practices guide']
            }
        ]
        
        return jsonify({'skill_gaps': demo_skill_gap})
            
    except Exception as e:
        logger.error(f"Skill gap error: {e}")
        demo_skill_gap = [
            {'skill': 'System Design', 'current': 40, 'target': 85, 'importance': 'High', 'gap': 45},
            {'skill': 'Cloud Architecture', 'current': 30, 'target': 80, 'importance': 'High', 'gap': 50}
        ]
        return jsonify({'skill_gaps': demo_skill_gap})

@app.route("/api/career/market-insights/<path:role>", methods=["GET", "OPTIONS"])
def get_market_insights(role):
    """Get market insights for a specific role in Pakistan - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Pakistan-specific market data
        market_data = {
            'Software Engineer': {
                'salary_range': 'Rs. 150,000 - 350,000',
                'demand': 'Very High',
                'growth_rate': '25%',
                'companies': ['Systems Limited', 'Techlogix', 'Contour Software', 'Arbisoft', 'Devsinc']
            },
            'Senior Software Engineer': {
                'salary_range': 'Rs. 250,000 - 500,000',
                'demand': 'High',
                'growth_rate': '20%',
                'companies': ['Systems Limited', 'Techlogix', 'Afiniti', 'Careem', 'Motive']
            },
            'Tech Lead': {
                'salary_range': 'Rs. 400,000 - 800,000',
                'demand': 'High',
                'growth_rate': '30%',
                'companies': ['Afiniti', 'Careem', 'Motive', 'Systems Limited', 'Devsinc']
            },
            'AI/ML Engineer': {
                'salary_range': 'Rs. 300,000 - 700,000',
                'demand': 'Very High',
                'growth_rate': '40%',
                'companies': ['Afiniti', 'Motive', 'Nayatel', '10Pearls', 'Contour Software']
            },
            'Full Stack Developer': {
                'salary_range': 'Rs. 180,000 - 400,000',
                'demand': 'Very High',
                'growth_rate': '28%',
                'companies': ['Systems Limited', 'Arbisoft', 'Devsinc', 'Techlogix', 'Contour Software']
            },
            'DevOps Engineer': {
                'salary_range': 'Rs. 250,000 - 550,000',
                'demand': 'High',
                'growth_rate': '35%',
                'companies': ['Motive', 'Afiniti', 'Systems Limited', 'Careem', 'Techlogix']
            }
        }
        
        # Try to match role (case-insensitive partial match)
        matched_role = None
        for key in market_data.keys():
            if role.lower() in key.lower() or key.lower() in role.lower():
                matched_role = key
                break
        
        # Return matched data or default
        if matched_role:
            response_data = market_data[matched_role]
        else:
            # Default response for unknown roles
            response_data = {
                'salary_range': 'Rs. 200,000 - 500,000',
                'demand': 'High',
                'growth_rate': '25%',
                'companies': ['Systems Limited', 'Techlogix', 'Arbisoft', 'Contour Software', 'Devsinc']
            }
        
        # Add market trends for Pakistan
        response_data['market_trends'] = [
            'Increasing demand for cloud and AI skills',
            'Remote work becoming standard practice',
            'Focus on product-based companies',
            'Rise of tech hubs in Karachi, Lahore, Islamabad',
            'Growing startup ecosystem with foreign investment'
        ]
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Market insights error: {e}")
        return jsonify({
            'salary_range': 'Rs. 200,000 - 500,000',
            'demand': 'High',
            'growth_rate': '25%',
            'companies': ['Systems Limited', 'Techlogix', 'Arbisoft'],
            'market_trends': ['Growing tech industry in Pakistan', 'Increasing remote work opportunities']
        })

@app.route("/api/chat/history", methods=["GET", "OPTIONS"])
def get_chat_history():
    """Get chat history for career coach - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Return welcome message if no history
        welcome_messages = [
            {
                'id': 1,
                'sender': 'ai',
                'text': "👋 Hi! I'm your AI Career Coach for Pakistan's tech industry. I can help you with:\n\n• 📊 Salary information for Pakistani tech roles\n• 🎯 Career path recommendations\n• 📚 Skills development and training\n• 🏢 Company insights and culture\n• 📝 Interview preparation tips\n• 💼 Job market trends in Pakistan\n\nWhat would you like to know about your career?",
                'timestamp': datetime.now().isoformat()
            }
        ]
        
        return jsonify({'messages': welcome_messages})
            
    except Exception as e:
        logger.error(f"Chat history error: {e}")
        return jsonify({'messages': []})

@app.route("/api/chat/send", methods=["POST", "OPTIONS"])
def send_chat_message():
    """Send a chat message to career coach - Public access"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        message = data.get('message', '')
        user_name = data.get('user_name', 'User')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Use career coach module to get response
        result = ai_career_predict({
            'action': 'chat',
            'message': message,
            'user_name': user_name,
            'session_id': 'guest'
        })
        
        if result.get('status') == 'success':
            answer = result.get('answer', '')
            return jsonify({
                'ai_response': {
                    'text': answer,
                    'timestamp': datetime.now().isoformat()
                }
            })
        
        # Enhanced fallback responses for common questions
        fallback_responses = {
            'salary': "💰 **Salary Ranges in Pakistan (Monthly):**\n\n• Entry Level (0-2 years): Rs. 50,000 - 150,000\n• Mid Level (3-5 years): Rs. 150,000 - 350,000\n• Senior Level (5+ years): Rs. 350,000 - 800,000\n• Lead/Architect: Rs. 500,000 - 1,200,000\n\nSalaries vary by company type, skills, and location.",
            
            'skills': "🎯 **Most In-Demand Skills in Pakistan:**\n\n1. **Programming:** Python, JavaScript/TypeScript, Java, Golang\n2. **Frontend:** React, Next.js, Vue.js\n3. **Backend:** Node.js, Django, Spring Boot\n4. **Cloud:** AWS, Azure, GCP\n5. **DevOps:** Docker, Kubernetes, CI/CD\n6. **AI/ML:** TensorFlow, PyTorch, LangChain\n7. **Databases:** PostgreSQL, MongoDB, Redis",
            
            'interview': "📝 **Interview Preparation Tips:**\n\n1. **Technical:** Practice LeetCode (easy-medium problems)\n2. **System Design:** Study scalability, databases, caching\n3. **Behavioral:** Use STAR method (Situation, Task, Action, Result)\n4. **Company Research:** Know their tech stack and products\n5. **Practice:** Mock interviews with peers\n\nCommon topics: Data structures, algorithms, OOP, databases, and your past projects.",
            
            'company': "🏢 **Top Tech Companies in Pakistan:**\n\n**Product-Based:**\n• Afiniti\n• Careem\n• Motive\n• Devsinc\n\n**Service-Based:**\n• Systems Limited\n• Techlogix\n• Contour Software\n• Arbisoft\n• 10Pearls\n\n**Startups:**\n• Bazaar\n• Airlift\n• Bykea\n• Finja",
            
            'path': "🎯 **Career Paths in Tech:**\n\n**Technical Track:**\nJunior → Mid → Senior → Lead → Architect\n\n**Management Track:**\nDeveloper → Team Lead → Engineering Manager → Director → CTO\n\n**Specialist Track:**\nAI/ML Engineer, DevOps Engineer, Security Specialist, Data Engineer"
        }
        
        # Check for keywords in message
        message_lower = message.lower()
        for key, response in fallback_responses.items():
            if key in message_lower:
                return jsonify({
                    'ai_response': {
                        'text': response,
                        'timestamp': datetime.now().isoformat()
                    }
                })
        
        # Default response
        default_response = "I'm here to help with career guidance in Pakistan's tech industry. You can ask me about:\n\n• 💰 Salary ranges\n• 🎯 Career paths\n• 📚 Skills to learn\n• 📝 Interview preparation\n• 🏢 Companies in Pakistan\n\nWhat specific information are you looking for?"
        
        return jsonify({
            'ai_response': {
                'text': default_response,
                'timestamp': datetime.now().isoformat()
            }
        })
            
    except Exception as e:
        logger.error(f"Chat send error: {e}")
        return jsonify({
            'ai_response': {
                'text': "I'm experiencing some technical difficulties. Please try again in a moment.",
                'timestamp': datetime.now().isoformat()
            }
        })
# ============= EXISTING API ROUTES =============

@app.route("/health", methods=["GET"])
def health_check():
    """Check if all modules are working"""
    modules_status = {}
    
    try:
        test_result = ai_learning_predict({'action': 'status'})
        modules_status['ai_learning'] = test_result.get('status') == 'success'
    except Exception as e:
        modules_status['ai_learning'] = False
        logger.error(f"AI Learning module error: {e}")
    
    try:
        test_result = ai_productivity_predict({'action': 'health'})
        modules_status['ai_productivity'] = test_result.get('status') == 'success'
    except Exception as e:
        modules_status['ai_productivity'] = False
        logger.error(f"AI Productivity module error: {e}")
    
    try:
        test_result = ai_career_predict({'action': 'get_stats'})
        modules_status['ai_career_coach'] = test_result.get('status') == 'success'
    except Exception as e:
        modules_status['ai_career_coach'] = False
        logger.error(f"AI Career Coach module error: {e}")
    
    try:
        test_result = wellness_predict({'action': 'status'})
        modules_status['wellness'] = test_result.get('status') == 'success'
    except Exception as e:
        modules_status['wellness'] = False
        logger.error(f"Wellness module error: {e}")
    
    try:
        test_result = boat_predict({'action': 'status'})
        modules_status['boat'] = test_result.get('status') == 'success'
        if modules_status['boat']:
            kb_size = test_result.get('data', {}).get('knowledge_base_size', 0)
            rag_mode = test_result.get('data', {}).get('rag_mode', 'unknown')
            logger.info(f"✅ BOAT RAG Engine ready with {kb_size} documents ({rag_mode})")
    except Exception as e:
        modules_status['boat'] = False
        logger.error(f"BOAT module error: {e}")
    
    return jsonify({
        'status': 'healthy' if all(modules_status.values()) else 'partial',
        'modules': modules_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route("/chat", methods=["POST"])
def chat():
    """Chat endpoint for HR chatbot - uses BOAT's RAG with FLAN-T5"""
    try:
        data = request.json
        logger.info(f"Chat request received: {data}")
        
        message = data.get('message', '')
        user_name = data.get('user_name', '')
        session_id = data.get('session_id', None)
        
        if not message:
            return jsonify({'status': 'error', 'answer': 'Please provide a message.'}), 400
        
        is_greeting = message.lower().strip() in ["hi", "hello", "hey", "greetings", "hii", "helloo"]
        
        result = boat_predict({
            'action': 'ask',
            'question': message
        })
        
        logger.info(f"Chat response from BOAT: {result.get('status')}")
        
        answer = result.get('answer', "I'm sorry, I could not process your request.")
        
        if is_greeting and user_name:
            answer = f"Hello {user_name}! 👋 {answer}"
        elif is_greeting:
            answer = f"Hello! 👋 {answer}"
        
        source = result.get('source', None)
        if source and 'source' not in answer.lower():
            answer = f"{answer}\n\n💡 {source}"
        
        return jsonify({
            'answer': answer,
            'status': result.get('status', 'success'),
            'source': result.get('source', 'HR Documentation'),
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Chat route error: {e}")
        return jsonify({'status': 'error', 'answer': f'Server error: {str(e)}'}), 500

@app.route("/chat/advanced", methods=["POST"])
def chat_advanced():
    """Advanced chat endpoint with conversation history support"""
    try:
        data = request.json
        message = data.get('message', '')
        user_name = data.get('user_name', '')
        conversation_history = data.get('history', [])
        
        if not message:
            return jsonify({'status': 'error', 'answer': 'Please provide a message.'}), 400
        
        if conversation_history:
            recent_history = conversation_history[-6:]
            context_prompt = "\n".join([f"{h['role']}: {h['content']}" for h in recent_history])
            full_question = f"{context_prompt}\nUser: {message}"
        else:
            full_question = message
        
        result = boat_predict({
            'action': 'ask',
            'question': full_question
        })
        
        answer = result.get('answer', "I'm sorry, I could not process your request.")
        
        if message.lower().strip() in ["hi", "hello", "hey", "greetings"] and user_name:
            answer = f"Hello {user_name}! 👋 {answer}"
        
        return jsonify({
            'answer': answer,
            'status': result.get('status', 'success'),
            'source': result.get('source', 'HR Documentation')
        })
        
    except Exception as e:
        logger.error(f"Advanced chat route error: {e}")
        return jsonify({'status': 'error', 'answer': f'Server error: {str(e)}'}), 500

@app.route("/rag/search", methods=["POST"])
def rag_search():
    """Search HR documents directly"""
    try:
        data = request.json
        query = data.get('query', '')
        top_k = data.get('top_k', 5)
        
        if not query:
            return jsonify({'status': 'error', 'message': 'Please provide a search query.'}), 400
        
        result = boat_predict({
            'action': 'search',
            'query': query,
            'top_k': top_k
        })
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/ai_learning", methods=["POST"])
def ai_learning_route():
    try:
        data = request.json
        result = ai_learning_predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"AI Learning route error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/ai_productivity", methods=["POST"])
def ai_productivity_route():
    try:
        data = request.json
        result = ai_productivity_predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"AI Productivity route error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/ai_career_coach", methods=["POST"])
def ai_career_coach_route():
    try:
        data = request.json
        result = ai_career_predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"AI Career Coach route error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/wellness", methods=["POST"])
def wellness_route():
    try:
        data = request.json
        result = wellness_predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Wellness route error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/boat", methods=["POST"])
def boat_route():
    try:
        data = request.json
        result = boat_predict(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"BOAT route error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route("/rag/documents", methods=["GET"])
def get_hr_documents():
    """Get list of available HR documents"""
    try:
        result = boat_predict({'action': 'list_documents'})
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'status': 'error', 'message': 'Route not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

# ============= AI LEARNING HUB API ROUTES =============

@app.route("/api/skills", methods=["GET", "OPTIONS"])
def get_skills():
    """Get list of available skills"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Define common tech skills
        skills = [
            "Python", "JavaScript", "React", "Node.js", "Java", "Spring Boot",
            "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
            "AWS", "Azure", "Docker", "Kubernetes", "MongoDB", "PostgreSQL",
            "GraphQL", "TypeScript", "Next.js", "Vue.js", "Angular", "Django",
            "Flask", "FastAPI", "Data Science", "SQL", "Git", "CI/CD", "DevOps",
            "System Design", "Cloud Computing", "REST APIs", "Microservices"
        ]
        return jsonify({'all_skills': skills, 'skills': skills})
    except Exception as e:
        logger.error(f"Skills error: {e}")
        return jsonify({'all_skills': []})

@app.route("/api/job-roles", methods=["GET", "OPTIONS"])
def get_job_roles():
    """Get list of job roles"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        job_roles = [
            "Software Engineer", "Senior Software Engineer", "Tech Lead",
            "Full Stack Developer", "Frontend Developer", "Backend Developer",
            "DevOps Engineer", "Cloud Architect", "Data Scientist",
            "Machine Learning Engineer", "AI Engineer", "Product Manager",
            "QA Engineer", "Security Engineer", "Mobile Developer"
        ]
        return jsonify({'job_roles': job_roles})
    except Exception as e:
        logger.error(f"Job roles error: {e}")
        return jsonify({'job_roles': []})

@app.route("/api/upload-resume", methods=["POST", "OPTIONS"])
def upload_resume():
    """Upload and parse resume to detect skills"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Check if file was uploaded
        if 'resume' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['resume']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # For demo purposes, return mock detected skills
        # In production, you would parse the resume text
        
        mock_detected_skills = [
            {'name': 'Python', 'confidence': 85, 'source': 'resume'},
            {'name': 'JavaScript', 'confidence': 80, 'source': 'resume'},
            {'name': 'React', 'confidence': 75, 'source': 'resume'},
            {'name': 'Node.js', 'confidence': 70, 'source': 'resume'},
            {'name': 'Machine Learning', 'confidence': 65, 'source': 'resume'}
        ]
        
        confidence_scores = {skill['name']: skill['confidence'] for skill in mock_detected_skills}
        
        return jsonify({
            'detected_skills': [s['name'] for s in mock_detected_skills],
            'confidence_scores': confidence_scores,
            'sources_used': {'resume': True}
        })
        
    except Exception as e:
        logger.error(f"Resume upload error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/detect-skills", methods=["POST", "OPTIONS"])
def detect_skills():
    """Detect skills from job role and projects"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        job_role = data.get('job_role', '')
        projects = data.get('projects', [])
        
        detected_skills = []
        sources_used = {}
        
        # Skills mapping for different job roles
        role_skills = {
            'Software Engineer': ['Python', 'JavaScript', 'Data Structures', 'Algorithms', 'Git'],
            'Senior Software Engineer': ['System Design', 'Architecture', 'Code Review', 'Leadership', 'Advanced Algorithms'],
            'Tech Lead': ['Team Leadership', 'Project Management', 'Technical Architecture', 'Agile', 'Mentoring'],
            'Full Stack Developer': ['React', 'Node.js', 'MongoDB', 'REST APIs', 'HTML/CSS'],
            'Frontend Developer': ['React', 'Vue.js', 'TypeScript', 'CSS', 'Web Performance'],
            'Backend Developer': ['Node.js', 'Python', 'Java', 'SQL', 'API Design'],
            'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'],
            'Machine Learning Engineer': ['Python', 'TensorFlow', 'PyTorch', 'Data Science', 'Statistics'],
            'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Statistics', 'Data Visualization']
        }
        
        # Detect from job role
        if job_role:
            for role, skills in role_skills.items():
                if job_role.lower() in role.lower() or role.lower() in job_role.lower():
                    for skill in skills:
                        detected_skills.append({
                            'name': skill,
                            'confidence': 70,
                            'source': 'job_role'
                        })
            sources_used['job_role'] = bool(job_role)
        
        # Detect from projects
        if projects:
            tech_stack = set()
            for project in projects:
                for tech in project.get('technologies', []):
                    tech_stack.add(tech)
            
            for tech in tech_stack:
                detected_skills.append({
                    'name': tech,
                    'confidence': 85,
                    'source': 'projects'
                })
            sources_used['projects'] = len(projects) > 0
        
        # Remove duplicates, keep highest confidence
        skill_map = {}
        for skill in detected_skills:
            name = skill['name']
            if name not in skill_map or skill_map[name]['confidence'] < skill['confidence']:
                skill_map[name] = skill
        
        final_skills = list(skill_map.values())
        
        # Sort by confidence
        final_skills.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Limit to top 10
        final_skills = final_skills[:10]
        
        return jsonify({
            'detected_skills': final_skills,
            'sources_used': sources_used
        })
        
    except Exception as e:
        logger.error(f"Skill detection error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/recommend", methods=["POST", "OPTIONS"])
def recommend_courses():
    """Get course recommendations based on skills"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        use_auto_detection = data.get('use_auto_detection', False)
        skills = data.get('skills', [])
        job_role = data.get('job_role', '')
        projects = data.get('projects', [])
        
        # Use AI learning module for recommendations
        try:
            # Call the AI learning module
            result = ai_learning_predict({
                'skills': skills if skills else ['Python', 'Machine Learning']
            })
            
            if result.get('status') == 'success':
                recommendations = result.get('recommendations', [])
                if recommendations:
                    return jsonify({'recommendations': recommendations})
        except Exception as e:
            logger.error(f"AI Learning module error: {e}")
        
        # Return mock recommendations if module fails
        mock_recommendations = [
            {
                'id': 1,
                'title': 'Python for Data Science',
                'platform': 'Coursera',
                'skills': 'Python, Pandas, NumPy, Data Visualization',
                'duration': '25 hours',
                'level': 'Beginner',
                'rating': 4.7,
                'students': 250000,
                'category': 'Data Science',
                'relevance': 95
            },
            {
                'id': 2,
                'title': 'Machine Learning Specialization',
                'platform': 'DeepLearning.AI',
                'skills': 'Machine Learning, Python, TensorFlow, Neural Networks',
                'duration': '40 hours',
                'level': 'Intermediate',
                'rating': 4.9,
                'students': 500000,
                'category': 'AI/ML',
                'relevance': 92
            },
            {
                'id': 3,
                'title': 'React - The Complete Guide',
                'platform': 'Udemy',
                'skills': 'React, JavaScript, Hooks, Redux, Frontend',
                'duration': '30 hours',
                'level': 'Intermediate',
                'rating': 4.6,
                'students': 150000,
                'category': 'Web Development',
                'relevance': 88
            },
            {
                'id': 4,
                'title': 'AWS Certified Solutions Architect',
                'platform': 'Udemy',
                'skills': 'AWS, Cloud, EC2, S3, Lambda, DevOps',
                'duration': '50 hours',
                'level': 'Advanced',
                'rating': 4.7,
                'students': 120000,
                'category': 'Cloud',
                'relevance': 85
            },
            {
                'id': 5,
                'title': 'Full Stack Web Development',
                'platform': 'Coursera',
                'skills': 'React, Node.js, MongoDB, Express, REST APIs',
                'duration': '45 hours',
                'level': 'Intermediate',
                'rating': 4.8,
                'students': 200000,
                'category': 'Web Development',
                'relevance': 90
            }
        ]
        
        # Filter based on skills if provided
        if skills:
            filtered = []
            for course in mock_recommendations:
                course_skills_lower = course['skills'].lower()
                if any(skill.lower() in course_skills_lower for skill in skills):
                    filtered.append(course)
            if filtered:
                return jsonify({'recommendations': filtered[:5]})
        
        return jsonify({'recommendations': mock_recommendations})
        
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/learning-path", methods=["POST", "OPTIONS"])
def get_learning_path():
    """Get structured learning path"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        target_skills = data.get('targetSkills', [])
        
        # Create mock learning path
        learning_path = [
            {
                'week': 1,
                'focus': 'Foundations',
                'hours': 5,
                'resources': 3,
                'priority': 'High',
                'skills_covered': target_skills[:2] if target_skills else ['Python Basics', 'Programming Fundamentals']
            },
            {
                'week': 2,
                'focus': 'Core Concepts',
                'hours': 8,
                'resources': 5,
                'priority': 'High',
                'skills_covered': target_skills[2:4] if len(target_skills) > 2 else ['Data Structures', 'Algorithms']
            },
            {
                'week': 3,
                'focus': 'Advanced Topics',
                'hours': 10,
                'resources': 4,
                'priority': 'Medium',
                'skills_covered': target_skills[4:6] if len(target_skills) > 4 else ['System Design', 'Architecture']
            },
            {
                'week': 4,
                'focus': 'Project & Practice',
                'hours': 12,
                'resources': 6,
                'priority': 'High',
                'skills_covered': target_skills[6:8] if len(target_skills) > 6 else ['Project Implementation', 'Best Practices']
            }
        ]
        
        return jsonify({'learning_path': learning_path})
        
    except Exception as e:
        logger.error(f"Learning path error: {e}")
        return jsonify({'learning_path': []}), 500

@app.route("/api/daily-task", methods=["POST", "OPTIONS"])
def get_daily_task():
    """Get daily learning task"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        skills = data.get('skills', [])
        
        # Create mock daily task
        daily_tasks = [
            {
                'topic': 'Learn React Hooks',
                'duration': '45 min',
                'format': 'Interactive Tutorial',
                'priority': 'High',
                'category': 'Frontend'
            },
            {
                'topic': 'Practice Python Functions',
                'duration': '30 min',
                'format': 'Coding Exercise',
                'priority': 'Medium',
                'category': 'Programming'
            },
            {
                'topic': 'Watch: AWS Basics',
                'duration': '60 min',
                'format': 'Video Course',
                'priority': 'High',
                'category': 'Cloud'
            },
            {
                'topic': 'Build a Small Project',
                'duration': '90 min',
                'format': 'Hands-on Project',
                'priority': 'High',
                'category': 'Project'
            }
        ]
        
        # Pick a task based on skills or random
        import random
        task = random.choice(daily_tasks)
        
        # Customize based on skills
        if skills:
            skill = skills[0] if skills else 'Python'
            task['topic'] = f"Learn {skill} Fundamentals"
            task['duration'] = '45 min'
        
        return jsonify(task)
        
    except Exception as e:
        logger.error(f"Daily task error: {e}")
        return jsonify({
            'topic': 'Review your learning goals',
            'duration': '30 min',
            'format': 'Self-study',
            'priority': 'Medium',
            'category': 'General'
        }), 500

# ============= PRODUCTIVITY API ROUTES =============

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def productivity_login():
    """Handle user login for productivity module"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        username = data.get('username', 'default_user')
        
        # Use the productivity module to handle login
        result = ai_productivity_predict({
            'action': 'login',
            'username': username,
            'email': f"{username}@example.com"
        })
        
        if result.get('status') == 'success':
            user_data = result.get('data', {}).get('user', {})
            
            # Store user in session
            session['user_id'] = user_data.get('id')
            session['username'] = user_data.get('username')
            
            return jsonify({
                'success': True,
                'user': user_data
            })
        else:
            return jsonify({'error': 'Login failed'}), 500
            
    except Exception as e:
        logger.error(f"Productivity login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/productivity/today", methods=["GET", "OPTIONS"])
def get_today_productivity():
    """Get today's productivity data"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        # Get user_id from session or use default
        user_id = session.get('user_id', 1)
        
        result = ai_productivity_predict({
            'action': 'get_today',
            'user_id': user_id
        })
        
        if result.get('status') == 'success':
            return jsonify(result.get('data', {}))
        else:
            # Return mock data if module fails
            return jsonify({
                'productivity_score': {
                    'today': 75,
                    'week': 70,
                    'month': 72,
                    'focus': 65,
                    'efficiency': 80
                },
                'timeTracking': {
                    'productiveHours': 4.5,
                    'meetings': 1.5,
                    'breaks': 0.5,
                    'distractions': 1.0,
                    'deepWork': 2.0
                },
                'focusSessions': [],
                'distractions': [],
                'suggestions': [
                    {
                        'id': 1,
                        'title': 'Increase Deep Work',
                        'description': 'Try to schedule 2-3 hours of uninterrupted deep work in the morning.',
                        'impact': 'Boost productivity by 25%',
                        'priority': 'high',
                        'category': 'focus'
                    },
                    {
                        'id': 2,
                        'title': 'Take Regular Breaks',
                        'description': 'Take a 5-minute break every hour to maintain focus.',
                        'impact': 'Improve concentration',
                        'priority': 'medium',
                        'category': 'breaks'
                    }
                ],
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error getting today's productivity: {e}")
        return jsonify({
            'productivity_score': {'today': 75, 'week': 70, 'month': 72, 'focus': 65, 'efficiency': 80},
            'timeTracking': {'productiveHours': 4.5, 'meetings': 1.5, 'breaks': 0.5, 'distractions': 1.0, 'deepWork': 2.0},
            'focusSessions': [],
            'distractions': [],
            'suggestions': [],
            'timestamp': datetime.now().isoformat()
        })

@app.route("/api/productivity/update-time", methods=["POST", "OPTIONS"])
def update_productivity_time():
    """Update time tracking"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        user_id = session.get('user_id', 1)
        data = request.json
        
        result = ai_productivity_predict({
            'action': 'update_time',
            'user_id': user_id,
            'data': data
        })
        
        if result.get('status') == 'success':
            return jsonify({'success': True, 'message': 'Time tracking updated'})
        else:
            return jsonify({'error': 'Failed to update time'}), 500
            
    except Exception as e:
        logger.error(f"Error updating time: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/productivity/start-session", methods=["POST", "OPTIONS"])
def start_focus_session():
    """Start a focus session"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        user_id = session.get('user_id', 1)
        data = request.json
        task = data.get('task', 'Deep Work Session')
        
        result = ai_productivity_predict({
            'action': 'start_session',
            'user_id': user_id,
            'task': task
        })
        
        if result.get('status') == 'success':
            session_data = result.get('data', {})
            return jsonify({
                'session_id': session_data.get('session_id')
            })
        else:
            return jsonify({'error': 'Failed to start session'}), 500
            
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/productivity/end-session", methods=["POST", "OPTIONS"])
def end_focus_session():
    """End a focus session"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        user_id = session.get('user_id', 1)
        data = request.json
        session_id = data.get('session_id')
        
        result = ai_productivity_predict({
            'action': 'end_session',
            'user_id': user_id,
            'session_id': session_id
        })
        
        if result.get('status') == 'success':
            session_data = result.get('data', {})
            return jsonify({
                'session': session_data
            })
        else:
            return jsonify({'error': 'Failed to end session'}), 500
            
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/productivity/log-distraction", methods=["POST", "OPTIONS"])
def log_distraction():
    """Log a distraction"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        user_id = session.get('user_id', 1)
        data = request.json
        source = data.get('source', 'Unknown')
        duration = data.get('duration', 5)
        
        result = ai_productivity_predict({
            'action': 'log_distraction',
            'user_id': user_id,
            'source': source,
            'duration': duration
        })
        
        if result.get('status') == 'success':
            return jsonify({'success': True, 'message': 'Distraction logged'})
        else:
            return jsonify({'error': 'Failed to log distraction'}), 500
            
    except Exception as e:
        logger.error(f"Error logging distraction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/productivity/history", methods=["GET", "OPTIONS"])
def get_productivity_history():
    """Get productivity history"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
    
    try:
        user_id = session.get('user_id', 1)
        days = request.args.get('days', 30, type=int)
        
        result = ai_productivity_predict({
            'action': 'get_history',
            'user_id': user_id,
            'days': days
        })
        
        if result.get('status') == 'success':
            return jsonify(result.get('data', {}))
        else:
            return jsonify({'history': []})
            
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        return jsonify({'history': []})
    
    
if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 AI HRM System - Main Application Server")
    print("="*70)
    print("\n📚 HR Documentation RAG System Active")
    print("✅ All answers based strictly on HR documents")
    print("\n🌐 Available endpoints:")
    print("  POST /api/user/login      - User login")
    print("  POST /api/user/logout     - User logout")
    print("  GET  /api/check-session   - Check session")
    print("  GET  /api/checkin/status  - Check-in status")
    print("  POST /api/checkin         - Submit check-in")
    print("  GET  /api/weekly-wellness - Weekly wellness")
    print("  GET  /api/history         - User history")
    print("  GET  /api/stats           - User stats")
    print("  GET  /api/profile         - User profile (career coach)")
    print("  GET  /api/career/recommendations - Career recommendations")
    print("  POST /api/career/analyze-skill-gap - Skill gap analysis")
    print("  GET  /api/career/market-insights/<role> - Market insights")
    print("  GET  /api/chat/history    - Chat history")
    print("  POST /api/chat/send       - Send chat message")
    print("  POST /chat                - HR Chatbot")
    print("  POST /chat/advanced       - Advanced chat")
    print("  POST /rag/search          - Search HR docs")
    print("  GET  /rag/documents       - List HR docs")
    print("  POST /ai_learning         - Course recommendations")
    print("  POST /ai_productivity     - Productivity tracking")
    print("  POST /ai_career_coach     - Career guidance")
    print("  POST /wellness            - Wellness assessment")
    print("  POST /boat                - BOAT module")
    print("  GET  /health              - System health")
    print("\n" + "="*70)
    print("🎯 Server running on http://localhost:5001")
    print("💡 Tip: All HR answers are sourced from your documents in ../hr_docs/")
    print("="*70 + "\n")
    
    app.run(port=5001, debug=True, use_reloader=False)