# ai/ai_career_coach/ai_career_coach_module.py
import os
import re
from difflib import SequenceMatcher
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- GLOBAL DATA ---------------- #

qa_database = []
user_context = {}

# ---------------- LOAD DATA ---------------- #

def load_qa_database():
    """Load Q&A database from hr_docs folder"""
    global qa_database
    qa_database = []

    # Use the correct path - looking for hr_docs in the parent directory
    docs_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hr_docs")
    
    # If not found, try current directory
    if not os.path.exists(docs_folder):
        docs_folder = os.path.join(os.path.dirname(__file__), "hr_docs")
    
    # If still not found, create in current directory
    if not os.path.exists(docs_folder):
        docs_folder = os.path.join(os.path.dirname(__file__), "hr_docs")
        os.makedirs(docs_folder, exist_ok=True)
        create_sample_docs(docs_folder)

    print(f"Loading HR documents from: {docs_folder}")

    for filename in os.listdir(docs_folder):
        if filename.endswith('.txt'):
            category = filename.replace('.txt', '')
            filepath = os.path.join(docs_folder, filename)

            try:
                with open(filepath, 'r', encoding='utf-8') as file:
                    content = file.read()
                    parse_qa_pairs(content, category)
                print(f"✓ Loaded {category} document")
            except Exception as e:
                logger.error(f"Error loading {filename}: {e}")

    print(f"✅ Loaded {len(qa_database)} Q&A pairs")
    return qa_database

# ---------------- PARSE DATA ---------------- #

def parse_qa_pairs(content, category):
    """Parse Q&A pairs from text content"""
    lines = content.split('\n')
    current_q = None
    current_a = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('Q:'):
            if current_q and current_a:
                qa_database.append({
                    'question': current_q.lower(),
                    'answer': ' '.join(current_a),
                    'category': category,
                    'keywords': extract_keywords(current_q)
                })
            current_q = line[2:].strip()
            current_a = []

        elif line.startswith('A:') and current_q:
            current_a.append(line[2:].strip())

        elif current_q:
            current_a.append(line)

    if current_q and current_a:
        qa_database.append({
            'question': current_q.lower(),
            'answer': ' '.join(current_a),
            'category': category,
            'keywords': extract_keywords(current_q)
        })

# ---------------- NLP HELPERS ---------------- #

def extract_keywords(question):
    """Extract keywords from question"""
    stopwords = {'where', 'how', 'what', 'when', 'why', 'do', 'i', 'my', 'the', 'a', 'an', 'is', 'are', 'am'}
    return [w for w in question.lower().split() if w not in stopwords]

def calculate_similarity(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# ---------------- CORE CHAT LOGIC ---------------- #

def find_best_answer(question, user_name=None):
    """Find the best answer for a given question"""
    question = question.lower().strip()
    question_words = set(extract_keywords(question))

    # Get last category for context
    last_category = user_context.get(user_name, {}).get('last_category') if user_name else None

    # Greetings
    greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon']
    if question in greetings:
        return f"Hello {user_name or 'there'}! 👋 How can I help you with career guidance or HR questions today?"

    # Career-specific keywords
    career_keywords = ['career', 'job', 'interview', 'resume', 'cv', 'salary', 'promotion', 'skills', 'training']
    if any(keyword in question for keyword in career_keywords):
        # Add career-specific responses
        if 'interview' in question:
            return "📝 **Interview Tips:**\n- Research the company thoroughly\n- Practice common interview questions\n- Prepare specific examples of your achievements\n- Dress professionally and arrive early\n- Follow up with a thank-you email"
        
        if 'resume' in question or 'cv' in question:
            return "📄 **Resume Tips:**\n- Keep it concise (1-2 pages)\n- Highlight achievements, not just responsibilities\n- Use action verbs (led, created, improved)\n- Tailor for each job application\n- Include relevant keywords from job description"
        
        if 'salary' in question:
            return "💰 **Salary Negotiation Tips:**\n- Research market rates for your role\n- Know your worth and be confident\n- Consider the entire compensation package\n- Practice your negotiation conversation\n- Be professional and positive"

    scored_answers = []

    for qa in qa_database:
        score = 0

        # Exact match
        if question == qa['question']:
            score = 100

        # Keyword matching
        common = question_words & set(qa['keywords'])
        score += len(common) * 10

        # Similarity matching
        score += calculate_similarity(question, qa['question']) * 50

        # Category context
        if last_category and qa['category'] == last_category:
            score += 15

        scored_answers.append((score, qa))

    if scored_answers:
        best_score, best_qa = max(scored_answers, key=lambda x: x[0])

        if best_score > 25:
            if user_name:
                user_context.setdefault(user_name, {})['last_category'] = best_qa['category']
            return best_qa['answer']

    # Fallback responses based on keywords
    if 'attendance' in question:
        return "📅 To mark attendance, please visit: https://portal.company.com/attendance\n\nNeed help? Contact HR at hr@company.com"

    if 'leave' in question:
        return "🏖️ To apply for leave:\n1. Go to https://portal.company.com/leave\n2. Select leave type\n3. Enter dates and reason\n4. Submit for approval"

    if 'payroll' in question:
        return "💰 Payroll Information:\n- Payday: Last working day of the month\n- View payslips: https://portal.company.com/payroll\n- For discrepancies, contact finance@company.com"

    if 'policy' in question:
        return "📚 Company Policies are available at: https://portal.company.com/policies\n\nKey policies include:\n- Code of Conduct\n- Remote Work Policy\n- Leave Policy\n- Travel Policy"

    # Career coaching specific responses
    if 'career growth' in question or 'promotion' in question:
        return "🚀 **Career Growth Tips:**\n1. Set clear career goals\n2. Seek mentorship\n3. Develop new skills continuously\n4. Take on challenging projects\n5. Document your achievements\n6. Network within and outside the organization"

    if 'skills' in question:
        return "🎯 **Skills Development:**\n- Identify skills gaps through self-assessment\n- Take online courses (Coursera, Udemy, LinkedIn Learning)\n- Attend workshops and webinars\n- Practice through side projects\n- Get certified in your field"

    return "Thank you for your question. For specific HR or career queries, please contact:\n📧 hr@company.com\n📞 +92-XXX-XXXXXXX\n\nI'm here to help with common questions about attendance, leave, policies, and career development!"

# ---------------- SAMPLE DATA ---------------- #

def create_sample_docs(folder):
    """Create sample documentation files"""
    
    # Attendance document
    attendance_doc = """Q: Where do I mark attendance?
A: You can mark your attendance at: https://portal.company.com/attendance

Q: What time should I mark attendance?
A: Regular office hours: 9:00 AM to 6:00 PM. Please mark attendance at start and end of day.

Q: What if I forget to mark attendance?
A: Contact your manager or HR within 24 hours to get it rectified.
"""
    
    with open(os.path.join(folder, "attendance.txt"), "w", encoding='utf-8') as f:
        f.write(attendance_doc)
    
    # Leave policy document
    leave_doc = """Q: How do I apply for leave?
A: Go to https://portal.company.com/leave and submit a leave request with proper justification.

Q: How many leaves do I get?
A: Annual leave: 20 days, Sick leave: 12 days, Casual leave: 10 days per year.

Q: Can I apply for leave on short notice?
A: Emergency leaves require manager approval. For planned leaves, apply 2 weeks in advance.
"""
    
    with open(os.path.join(folder, "leave.txt"), "w", encoding='utf-8') as f:
        f.write(leave_doc)
    
    # Career development document
    career_doc = """Q: How can I advance my career?
A: Focus on skill development, take on challenging projects, seek mentorship, and network actively.

Q: What training programs are available?
A: We offer technical certifications, leadership programs, and soft skills workshops throughout the year.

Q: How often are performance reviews?
A: Performance reviews are conducted quarterly with annual comprehensive reviews.
"""
    
    with open(os.path.join(folder, "career.txt"), "w", encoding='utf-8') as f:
        f.write(career_doc)
    
    print("✅ Sample HR documents created")

# ---------------- MAIN PREDICT FUNCTION ---------------- #

def predict(data):
    """
    Predict career coaching responses based on user query
    
    Expected data formats:
    1. Simple chat: {'message': 'How to apply for leave?', 'user_name': 'john'}
    2. With session: {'message': 'Hello', 'user_name': 'john', 'session_id': '123'}
    3. Get stats: {'action': 'get_stats'}
    4. Clear context: {'action': 'clear_context', 'user_name': 'john'}
    5. Get recommendations: {'action': 'get_recommendations', 'user_id': '123'}
    6. Analyze skill gap: {'action': 'analyze_skill_gap', 'target_role': 'Tech Lead', 'current_skills': [...]}
    7. Get market insights: {'action': 'get_market_insights', 'role': 'Software Engineer'}
    8. Get chat history: {'action': 'get_chat_history', 'user_id': '123'}
    
    Returns: {
        'status': 'success',
        'answer': '...',
        'context': {...}
    }
    """
    try:
        action = data.get('action', 'chat')
        
        # ============= CHAT HANDLER =============
        if action == 'chat':
            message = data.get('message', '').strip()
            user_name = data.get('user_name', '')
            session_id = data.get('session_id')
            
            if not message:
                return {
                    'status': 'error',
                    'message': 'No message provided'
                }
            
            # Generate answer
            answer = find_best_answer(message, user_name or session_id)
            
            # Get conversation context
            context = {
                'last_question': message,
                'timestamp': __import__('datetime').datetime.now().isoformat()
            }
            
            if user_name or session_id:
                context['user'] = user_name or session_id
                context['last_category'] = user_context.get(user_name or session_id, {}).get('last_category')
            
            return {
                'status': 'success',
                'answer': answer,
                'context': context,
                'qa_pairs_loaded': len(qa_database)
            }
        
        # ============= GET RECOMMENDATIONS =============
        elif action == 'get_recommendations':
            """Return career path recommendations"""
            user_id = data.get('user_id', '')
            
            recommendations = [
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
            
            return {
                'status': 'success',
                'data': {
                    'recommendations': recommendations
                }
            }
        
        # ============= ANALYZE SKILL GAP =============
        elif action == 'analyze_skill_gap':
            """Analyze skill gap for target role"""
            target_role = data.get('target_role', 'Tech Lead')
            current_skills = data.get('current_skills', [])
            
            # Define skill requirements for different roles
            role_requirements = {
                'Tech Lead': {
                    'skills': {
                        'System Design': {'target': 85, 'importance': 'High'},
                        'Cloud Architecture': {'target': 80, 'importance': 'High'},
                        'Team Leadership': {'target': 85, 'importance': 'Medium'},
                        'Project Management': {'target': 75, 'importance': 'Medium'},
                        'Code Review': {'target': 90, 'importance': 'High'},
                        'Technical Documentation': {'target': 80, 'importance': 'Medium'}
                    },
                    'resources': [
                        'System Design Interview by Alex Xu',
                        'AWS Solutions Architect Certification',
                        'Leading Teams by Google',
                        'Agile Project Management Courses'
                    ]
                },
                'Senior Software Engineer': {
                    'skills': {
                        'System Design': {'target': 80, 'importance': 'High'},
                        'Advanced Algorithms': {'target': 85, 'importance': 'High'},
                        'Performance Optimization': {'target': 80, 'importance': 'High'},
                        'Testing Strategies': {'target': 75, 'importance': 'Medium'},
                        'API Design': {'target': 85, 'importance': 'High'}
                    },
                    'resources': [
                        'Designing Data-Intensive Applications',
                        'Cracking the Coding Interview',
                        'Clean Code by Robert Martin',
                        'System Design Interview Guide'
                    ]
                },
                'AI/ML Engineer': {
                    'skills': {
                        'Machine Learning': {'target': 85, 'importance': 'High'},
                        'Deep Learning': {'target': 80, 'importance': 'High'},
                        'Python': {'target': 90, 'importance': 'High'},
                        'Data Engineering': {'target': 75, 'importance': 'Medium'},
                        'Statistics': {'target': 80, 'importance': 'High'}
                    },
                    'resources': [
                        'Deep Learning Specialization (Andrew Ng)',
                        'Fast.ai Courses',
                        'Hands-On Machine Learning',
                        'Kaggle Competitions'
                    ]
                }
            }
            
            # Get requirements for target role
            requirements = role_requirements.get(target_role, role_requirements['Tech Lead'])
            skill_gaps = []
            
            # Calculate skill gaps
            for skill, req in requirements['skills'].items():
                # Simulate current skill level based on matching with current skills
                current_level = 30  # Default low
                for current_skill in current_skills:
                    if skill.lower() in current_skill.lower() or current_skill.lower() in skill.lower():
                        current_level = 60  # Some knowledge
                        break
                
                gap = req['target'] - current_level
                if gap > 20:  # Only show significant gaps
                    skill_gaps.append({
                        'skill': skill,
                        'current': current_level,
                        'target': req['target'],
                        'importance': req['importance'],
                        'gap': gap,
                        'resources': requirements['resources'][:2]
                    })
            
            # Sort by importance (High first)
            importance_order = {'High': 0, 'Medium': 1, 'Low': 2}
            skill_gaps.sort(key=lambda x: importance_order[x['importance']])
            
            return {
                'status': 'success',
                'data': {
                    'skill_gaps': skill_gaps,
                    'target_role': target_role,
                    'recommended_resources': requirements['resources']
                }
            }
        
        # ============= GET MARKET INSIGHTS =============
        elif action == 'get_market_insights':
            """Get market insights for Pakistan tech industry"""
            role = data.get('role', 'Software Engineer')
            
            # Pakistan-specific market data
            market_data = {
                'Software Engineer': {
                    'salary_range': 'Rs. 150,000 - 350,000',
                    'demand': 'Very High',
                    'growth_rate': '25%',
                    'companies': ['Systems Limited', 'Techlogix', 'Contour Software', 'Arbisoft', 'Devsinc'],
                    'job_openings': '500+',
                    'remote_opportunities': 'High'
                },
                'Senior Software Engineer': {
                    'salary_range': 'Rs. 250,000 - 500,000',
                    'demand': 'High',
                    'growth_rate': '20%',
                    'companies': ['Systems Limited', 'Techlogix', 'Afiniti', 'Careem', 'Motive'],
                    'job_openings': '300+',
                    'remote_opportunities': 'High'
                },
                'Tech Lead': {
                    'salary_range': 'Rs. 400,000 - 800,000',
                    'demand': 'High',
                    'growth_rate': '30%',
                    'companies': ['Afiniti', 'Careem', 'Motive', 'Systems Limited', 'Devsinc'],
                    'job_openings': '150+',
                    'remote_opportunities': 'Medium'
                },
                'AI/ML Engineer': {
                    'salary_range': 'Rs. 300,000 - 700,000',
                    'demand': 'Very High',
                    'growth_rate': '40%',
                    'companies': ['Afiniti', 'Motive', 'Nayatel', '10Pearls', 'Contour Software'],
                    'job_openings': '200+',
                    'remote_opportunities': 'High'
                }
            }
            
            # Find matching role
            matched_role = None
            for key in market_data.keys():
                if role.lower() in key.lower() or key.lower() in role.lower():
                    matched_role = key
                    break
            
            response_data = market_data.get(matched_role, {
                'salary_range': 'Rs. 200,000 - 500,000',
                'demand': 'High',
                'growth_rate': '25%',
                'companies': ['Systems Limited', 'Techlogix', 'Arbisoft'],
                'job_openings': 'Varies by role',
                'remote_opportunities': 'High'
            })
            
            # Add market trends
            response_data['market_trends'] = [
                'Increasing demand for cloud and AI skills',
                'Remote work becoming standard',
                'Focus on product-based companies',
                'Rise of tech hubs in Karachi, Lahore, Islamabad'
            ]
            
            return {
                'status': 'success',
                'data': response_data
            }
        
        # ============= GET CHAT HISTORY =============
        elif action == 'get_chat_history':
            """Get chat history for user"""
            user_id = data.get('user_id', '')
            
            # Return empty history for now (can be implemented with database)
            return {
                'status': 'success',
                'data': {
                    'messages': []
                }
            }
        
        # ============= EXISTING HANDLERS =============
        elif action == 'clear_context':
            user_name = data.get('user_name')
            session_id = data.get('session_id')
            user_key = user_name or session_id
            
            if user_key and user_key in user_context:
                del user_context[user_key]
                return {
                    'status': 'success',
                    'message': 'Context cleared successfully'
                }
            else:
                return {
                    'status': 'success',
                    'message': 'No context to clear'
                }
        
        elif action == 'get_stats':
            return {
                'status': 'success',
                'data': {
                    'qa_pairs': len(qa_database),
                    'active_sessions': len(user_context),
                    'categories': list(set(qa['category'] for qa in qa_database))
                }
            }
        
        elif action == 'reload_data':
            load_qa_database()
            return {
                'status': 'success',
                'message': f'Reloaded {len(qa_database)} Q&A pairs'
            }
        
        elif action == 'health':
            return {
                'status': 'success',
                'qa_pairs': len(qa_database)
            }
        
        else:
            return {
                'status': 'error',
                'message': f'Unknown action: {action}'
            }
            
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }

# ---------------- INITIALIZATION ---------------- #

# Load the Q&A database when module is imported
load_qa_database()

# ---------------- FOR TESTING ---------------- #

if __name__ == "__main__":
    # Test the predict function
    test_data = {
        'action': 'chat',
        'message': 'How do I apply for leave?',
        'user_name': 'test_user'
    }
    result = predict(test_data)
    print("Test Result:")
    print(result)
    
    # Test stats
    stats = predict({'action': 'get_stats'})
    print("\nStats:")
    print(stats)
    
    # Test recommendations
    recs = predict({'action': 'get_recommendations'})
    print("\nRecommendations:")
    print(recs)