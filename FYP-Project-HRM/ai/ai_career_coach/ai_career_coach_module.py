# ai_career_coach_module.py - COMPLETE RAG-BASED (READS ALL YOUR TXT FILES)
import os
import re
import json
import logging
from difflib import SequenceMatcher
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= HELPER FUNCTION =============

def normalize_profile(profile):
    """Convert profile from any format to expected format"""
    if not profile:
        return {}
    normalized = {}
    skills = profile.get('skills', [])
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except:
            skills = []
    normalized['skills'] = skills
    normalized['current_role'] = profile.get('current_role') or profile.get('currentRole') or ''
    normalized['experience_years'] = profile.get('experience_years') or profile.get('experience') or 0
    normalized['education_level'] = profile.get('education_level') or profile.get('education') or ''
    normalized['career_goal'] = profile.get('career_goal') or profile.get('careerGoal') or ''
    normalized['location'] = profile.get('location') or 'Lahore'
    return normalized

# ============= RAG KNOWLEDGE BASE =============

class CareerKnowledgeBase:
    def __init__(self):
        self.qa_database = []
        self.skills_list = []
        self.institutes_list = []
        self.recommendations = []
        self.resume_tips_list = []
        self.freelancing_guide = ""
        self.market_data = {}
        self.roadmaps = {}
        self.certifications = []
        self.companies = []
        self.career_questions = []
        self.greetings = {}
        
        self.load_all_files()

    def load_all_files(self):
        """Load all knowledge base text files from rag folder"""
        rag_folder = os.path.join(os.path.dirname(__file__), "rag")
        
        if not os.path.exists(rag_folder):
            os.makedirs(rag_folder, exist_ok=True)
            print(f"📁 Created rag folder at {rag_folder}")
            print("⚠️ Please add your .txt files to the rag folder")
            return

        # Load career paths (with roadmaps)
        career_file = os.path.join(rag_folder, "career_paths.txt")
        if os.path.exists(career_file):
            try:
                with open(career_file, 'r', encoding='utf-8') as f:
                    self.parse_career_paths(f.read())
                print(f"✅ Loaded {len(self.recommendations)} career paths")
            except Exception as e:
                logger.error(f"Error loading career_paths.txt: {e}")

        # Load interview questions
        interview_file = os.path.join(rag_folder, "interview_prep.txt")
        if os.path.exists(interview_file):
            try:
                with open(interview_file, 'r', encoding='utf-8') as f:
                    self.parse_interview_questions(f.read())
                print(f"✅ Loaded {len(self.qa_database)} interview questions")
            except Exception as e:
                logger.error(f"Error loading interview_prep.txt: {e}")

        # Load skills
        skills_file = os.path.join(rag_folder, "skills_training.txt")
        if os.path.exists(skills_file):
            try:
                with open(skills_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    self.parse_skills(content)
                    self.parse_institutes(content)
                    self.parse_roadmaps(content)
                print(f"✅ Loaded skills and roadmaps")
            except Exception as e:
                logger.error(f"Error loading skills_training.txt: {e}")

        # Load resume tips
        resume_file = os.path.join(rag_folder, "resume_cv.txt")
        if os.path.exists(resume_file):
            try:
                with open(resume_file, 'r', encoding='utf-8') as f:
                    self.parse_resume_tips(f.read())
                print(f"✅ Loaded resume tips")
            except Exception as e:
                logger.error(f"Error loading resume_cv.txt: {e}")

        # Load freelancing guide
        freelancing_file = os.path.join(rag_folder, "freelancing.txt")
        if os.path.exists(freelancing_file):
            try:
                with open(freelancing_file, 'r', encoding='utf-8') as f:
                    self.freelancing_guide = f.read()
                print(f"✅ Loaded freelancing guide")
            except Exception as e:
                logger.error(f"Error loading freelancing.txt: {e}")

        # Load job market data
        job_market_file = os.path.join(rag_folder, "job_market.txt")
        if os.path.exists(job_market_file):
            try:
                with open(job_market_file, 'r', encoding='utf-8') as f:
                    self.parse_job_market(f.read())
                print(f"✅ Loaded job market data")
            except Exception as e:
                logger.error(f"Error loading job_market.txt: {e}")

        # Load companies
        companies_file = os.path.join(rag_folder, "companies.txt")
        if os.path.exists(companies_file):
            try:
                with open(companies_file, 'r', encoding='utf-8') as f:
                    self.parse_companies(f.read())
                print(f"✅ Loaded companies")
            except Exception as e:
                logger.error(f"Error loading companies.txt: {e}")

        # Load certifications
        certs_file = os.path.join(rag_folder, "certifications.txt")
        if os.path.exists(certs_file):
            try:
                with open(certs_file, 'r', encoding='utf-8') as f:
                    self.parse_certifications(f.read())
                print(f"✅ Loaded certifications")
            except Exception as e:
                logger.error(f"Error loading certifications.txt: {e}")

        # Load career questions
        questions_file = os.path.join(rag_folder, "career_questions.txt")
        if os.path.exists(questions_file):
            try:
                with open(questions_file, 'r', encoding='utf-8') as f:
                    self.parse_career_questions(f.read())
                print(f"✅ Loaded career questions")
            except Exception as e:
                logger.error(f"Error loading career_questions.txt: {e}")

        # Load greetings
        greetings_file = os.path.join(rag_folder, "greetings.txt")
        if os.path.exists(greetings_file):
            try:
                with open(greetings_file, 'r', encoding='utf-8') as f:
                    self.parse_greetings(f.read())
                print(f"✅ Loaded greetings")
            except Exception as e:
                logger.error(f"Error loading greetings.txt: {e}")

    def parse_career_paths(self, content):
        """Parse career paths and roadmaps from career_paths.txt"""
        lines = content.split('\n')
        current = {}
        roadmap_steps = []
        in_roadmap = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('##'):
                if current and current.get('title'):
                    if roadmap_steps:
                        current['roadmap'] = roadmap_steps
                    self.recommendations.append(current)
                    # Also store in roadmaps dict
                    self.roadmaps[current['title'].lower()] = {
                        'title': current['title'],
                        'duration': current.get('timeline', '1-2 years'),
                        'steps': roadmap_steps
                    }
                current = {'title': line.replace('#', '').strip()}
                roadmap_steps = []
                in_roadmap = False
                
            elif line.startswith('Description:'):
                current['description'] = line.replace('Description:', '').strip()
            elif line.startswith('Skills Needed:'):
                current['skills'] = line.replace('Skills Needed:', '').strip()
            elif line.startswith('Timeline:'):
                current['timeline'] = line.replace('Timeline:', '').strip()
            elif line.startswith('Salary Range:'):
                current['salary_range'] = line.replace('Salary Range:', '').strip()
            elif line.startswith('Companies:'):
                current['companies'] = line.replace('Companies:', '').strip()
            elif line.startswith('Roadmap:'):
                in_roadmap = True
            elif in_roadmap and line.startswith('-'):
                roadmap_steps.append(line[2:].strip())
        
        if current and current.get('title'):
            if roadmap_steps:
                current['roadmap'] = roadmap_steps
            self.recommendations.append(current)
            self.roadmaps[current['title'].lower()] = {
                'title': current['title'],
                'duration': current.get('timeline', '1-2 years'),
                'steps': roadmap_steps
            }

    def parse_interview_questions(self, content):
        """Parse Q&A pairs from interview_prep.txt"""
        lines = content.split('\n')
        current_q = None
        current_a = []
        current_category = "General"
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('##'):
                current_category = line.replace('#', '').strip()
                continue
            if line.startswith('Q:'):
                if current_q and current_a:
                    self.qa_database.append({
                        'question': current_q, 
                        'answer': ' '.join(current_a), 
                        'category': current_category
                    })
                current_q = line[2:].strip()
                current_a = []
            elif line.startswith('A:') and current_q:
                current_a.append(line[2:].strip())
            elif current_q:
                current_a.append(line)
                
        if current_q and current_a:
            self.qa_database.append({
                'question': current_q, 
                'answer': ' '.join(current_a), 
                'category': current_category
            })

    def parse_skills(self, content):
        """Parse in-demand skills from skills_training.txt"""
        lines = content.split('\n')
        in_skills_section = False
        
        for line in lines:
            line = line.strip()
            if 'Most In-Demand Skills' in line:
                in_skills_section = True
                continue
            if in_skills_section and line.startswith('##'):
                break
            if in_skills_section and line and line[0].isdigit() and '.' in line[:3]:
                skill = re.sub(r'^\d+\.\s*', '', line)
                skill = skill.split('(')[0].strip()
                if skill and len(skill) > 2:
                    self.skills_list.append(skill)
        
        if not self.skills_list:
            self.skills_list = ['Python', 'JavaScript', 'React', 'Node.js', 'AI/ML', 'Cloud Computing', 'Docker', 'Data Science']

    def parse_roadmaps(self, content):
        """Parse learning roadmaps from skills_training.txt"""
        lines = content.split('\n')
        current_roadmap = {}
        current_steps = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('##') and ('Roadmap' in line or 'Development' in line):
                if current_roadmap and current_roadmap.get('title'):
                    current_roadmap['steps'] = current_steps
                    self.roadmaps[current_roadmap['title'].lower()] = current_roadmap
                title = line.replace('#', '').strip()
                current_roadmap = {'title': title}
                current_steps = []
            elif line.startswith('Total Duration:'):
                current_roadmap['duration'] = line.replace('Total Duration:', '').strip()
            elif line.startswith('Month') or (line.startswith('**Month') and ':' in line):
                current_steps.append(line)
            elif line.startswith('-') and current_steps:
                current_steps[-1] = current_steps[-1] + '\n   ' + line
                
        if current_roadmap and current_roadmap.get('title'):
            current_roadmap['steps'] = current_steps
            self.roadmaps[current_roadmap['title'].lower()] = current_roadmap

    def parse_institutes(self, content):
        """Parse training institutes from skills_training.txt"""
        lines = content.split('\n')
        in_institutes_section = False
        
        for line in lines:
            line = line.strip()
            if 'Local Pakistani:' in line or 'Local Training' in line:
                in_institutes_section = True
                continue
            if in_institutes_section and line.startswith('-'):
                name = line.replace('-', '').strip()
                if name and len(name) > 3:
                    self.institutes_list.append({
                        'name': name, 
                        'certificates': 'Yes', 
                        'focus': 'Local (Pakistan)', 
                        'cost': 'Free/Varies', 
                        'skills': ['IT', 'Programming']
                    })
            if in_institutes_section and line.startswith('##'):
                break
                
        if not self.institutes_list:
            self.institutes_list = [
                {'name': 'Coursera', 'certificates': 'Yes', 'focus': 'International', 'cost': 'Financial Aid', 'skills': ['Python', 'AI']},
                {'name': 'DigiSkills Pakistan', 'certificates': 'Free', 'focus': 'Local', 'cost': 'Free', 'skills': ['Freelancing']},
                {'name': 'PIAIC', 'certificates': 'Yes', 'focus': 'AI & Computing', 'cost': 'Free', 'skills': ['AI', 'Cloud', 'Web']}
            ]

    def parse_resume_tips(self, content):
        """Parse resume tips from resume_cv.txt"""
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if (line.startswith('-') or line.startswith('•')) and len(line) > 5:
                tip = line.replace('-', '').replace('•', '').strip()
                if tip and len(tip) > 5:
                    self.resume_tips_list.append(tip)
                    
        if not self.resume_tips_list:
            self.resume_tips_list = [
                'Use ATS-friendly format with clear sections',
                'Highlight achievements with metrics',
                'Keep it concise (1-2 pages)',
                'Include LinkedIn and GitHub profiles'
            ]

    def parse_job_market(self, content):
        """Parse job market data from job_market.txt"""
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if 'Salary Guide' in line and ':' in line:
                self.market_data['salary_range'] = line.split(':')[1].strip()
            elif 'Demand' in line and ':' in line:
                self.market_data['demand'] = line.split(':')[1].strip()
            elif 'Growth Rate' in line and ':' in line:
                self.market_data['growth_rate'] = line.split(':')[1].strip()
            elif line.startswith('-') and ('Company' in line or 'company' in line):
                company = line.replace('-', '').strip()
                if company:
                    if 'companies' not in self.market_data:
                        self.market_data['companies'] = []
                    self.market_data['companies'].append(company)
                    
        if 'companies' not in self.market_data:
            self.market_data['companies'] = ['Systems Limited', 'Techlogix', 'Afiniti']
        if 'salary_range' not in self.market_data:
            self.market_data['salary_range'] = 'Rs. 150,000 - 350,000'
        if 'demand' not in self.market_data:
            self.market_data['demand'] = 'High'
        if 'growth_rate' not in self.market_data:
            self.market_data['growth_rate'] = '25%'

    def parse_companies(self, content):
        """Parse companies from companies.txt"""
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('##'):
                if '-' in line:
                    company = line.split('-')[0].strip()
                    if company and len(company) > 2:
                        self.companies.append(company)

    def parse_certifications(self, content):
        """Parse certifications from certifications.txt"""
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('##'):
                if '-' in line and 'Rs.' in line:
                    parts = line.split('-')
                    if len(parts) >= 2:
                        self.certifications.append({
                            'name': parts[0].strip(),
                            'cost': parts[1].strip() if len(parts) > 1 else 'Varies'
                        })

    def parse_career_questions(self, content):
        """Parse career questions from career_questions.txt"""
        lines = content.split('\n')
        current_q = None
        current_a = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('Q:'):
                if current_q and current_a:
                    self.career_questions.append({
                        'question': current_q,
                        'answer': ' '.join(current_a)
                    })
                current_q = line[2:].strip()
                current_a = []
            elif line.startswith('A:') and current_q:
                current_a.append(line[2:].strip())
            elif current_q:
                current_a.append(line)
                
        if current_q and current_a:
            self.career_questions.append({
                'question': current_q,
                'answer': ' '.join(current_a)
            })

    def parse_greetings(self, content):
        """Parse greetings from greetings.txt"""
        lines = content.split('\n')
        current_time = datetime.now().hour
        
        if 5 <= current_time < 12:
            self.greetings['time'] = 'morning'
        elif 12 <= current_time < 17:
            self.greetings['time'] = 'afternoon'
        elif 17 <= current_time < 21:
            self.greetings['time'] = 'evening'
        else:
            self.greetings['time'] = 'night'
        
        # Store all greetings
        self.greetings['content'] = content

    def get_greeting(self):
        """Get appropriate greeting based on time"""
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return "🌅 Good morning! Ready to plan your career journey?"
        elif 12 <= hour < 17:
            return "☀️ Good afternoon! How can I help with your career goals today?"
        elif 17 <= hour < 21:
            return "🌆 Good evening! Let's explore career opportunities in Pakistan's tech industry."
        else:
            return "🌙 Hi there! Never too late to work on your career. What would you like to know?"

    def get_interview_questions(self, domain="Web Development", limit=5):
        """Get interview questions for specific domain"""
        domain_lower = domain.lower()
        matching_questions = []
        
        for qa in self.qa_database:
            category = qa.get('category', '').lower()
            if domain_lower in category or category in domain_lower:
                matching_questions.append({
                    'question': qa['question'],
                    'answer': qa['answer']
                })
        
        limit = max(3, min(limit, 10))
        return matching_questions[:limit]

    def get_skills(self):
        return self.skills_list

    def get_institutes(self):
        return self.institutes_list

    def get_recommendations(self):
        return self.recommendations

    def get_roadmap(self, career_title):
        career_lower = career_title.lower()
        for key, roadmap in self.roadmaps.items():
            if career_lower in key or key in career_lower:
                return roadmap
        return None

    def get_skills_for_domain(self, domain):
        domain_lower = domain.lower()
        for rec in self.recommendations:
            if domain_lower in rec.get('title', '').lower():
                return rec.get('skills', '')
        return None

    def get_market_data(self):
        return self.market_data

    def get_resume_tips(self):
        return self.resume_tips_list

    def get_freelancing_guide(self):
        return self.freelancing_guide

    def get_certifications(self):
        return self.certifications

    def get_companies(self):
        return self.companies


# Initialize knowledge base
knowledge_base = CareerKnowledgeBase()


# ============= MAIN PREDICT FUNCTION =============

def predict(data):
    try:
        action = data.get('action', 'chat')

        # ============= GET INTERVIEW QUESTIONS =============
        if action == 'get_interview_questions':
            domain = data.get('domain', 'Web Development')
            limit = data.get('limit', 5)
            questions = knowledge_base.get_interview_questions(domain, limit)
            return {'status': 'success', 'domain': domain, 'questions': questions, 'total': len(questions)}

        # ============= GET RECOMMENDATIONS =============
        elif action == 'get_recommendations':
            recommendations = knowledge_base.get_recommendations()
            formatted = []
            for i, rec in enumerate(recommendations):
                steps = rec.get('skills', '').split(', ') if rec.get('skills') else []
                formatted.append({
                    'id': i + 1,
                    'title': rec.get('title', ''),
                    'description': rec.get('description', ''),
                    'confidence': 85,
                    'timeline': rec.get('timeline', '1-2 years'),
                    'steps': steps,
                    'salary_range': rec.get('salary_range', ''),
                    'companies': rec.get('companies', '')
                })
            return {'status': 'success', 'recommendations': formatted}

        # ============= GET IN-DEMAND SKILLS =============
        elif action == 'get_in_demand_skills':
            skills = knowledge_base.get_skills()
            return {'status': 'success', 'skills': skills}

        # ============= GET TRAINING INSTITUTES =============
        elif action == 'get_training_institutes':
            institutes = knowledge_base.get_institutes()
            return {'status': 'success', 'institutes': institutes}

        # ============= CHAT HANDLER =============
        elif action == 'chat':
            message = data.get('message', '').strip().lower()
            user_name = data.get('user_name', 'there')

            if not message:
                greeting = knowledge_base.get_greeting()
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': f"{greeting}\n\nI'm your AI Career Coach for Pakistan's tech industry.\n\nAsk me about:\n• Career paths\n• Skills\n• Roadmaps\n• Resume tips\n• Freelancing\n• Salary guides\n• Interview prep\n\nWhat would you like to know?",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'welcome'
                }

            # ========== INTENT 1: INTERVIEW ==========
            interview_words = ['interview', 'prepare for interview', 'interview tips', 'interview prep', 'job interview', 'interview preparation']
            if any(word in message for word in interview_words):
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': "🎯 Here are interview preparation tips. Check the sidebar for details!",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'show_interview',
                    'data': {
                        'tips': "Research the company thoroughly\nPractice common technical questions\nUse STAR method for behavioral questions\nPrepare questions to ask the interviewer\nDress professionally and be on time"
                    }
                }

            # ========== INTENT 2: RESUME ==========
            resume_words = ['resume', 'cv', 'resume tips', 'cv tips', 'resume help', 'make resume', 'build resume']
            if any(word in message for word in resume_words):
                tips = knowledge_base.get_resume_tips()
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': "📄 Here are resume tips for the Pakistani job market. Check the sidebar for details!",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'show_resume',
                    'data': {'tips': tips}
                }

            # ========== INTENT 3: FREELANCING ==========
            freelance_words = ['freelance', 'freelancing', 'upwork', 'fiverr', 'remote work', 'work from home']
            if any(word in message for word in freelance_words):
                guide = knowledge_base.get_freelancing_guide()
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': "💼 Here's the freelancing guide for Pakistan. Check the sidebar for details!",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'show_freelancing',
                    'data': {'guide': guide[:1500] if guide else "Freelancing guide content"}
                }

            # ========== INTENT 4: SALARY ==========
            salary_words = ['salary', 'pay', 'earning', 'how much', 'compensation', 'salary guide', 'package', 'income']
            if any(word in message for word in salary_words):
                market_data = knowledge_base.get_market_data()
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': "💰 Here's the salary guide for the Pakistani tech industry. Check the sidebar for details!",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'show_salary',
                    'data': {'salary': market_data}
                }

            # ========== INTENT 5: ROADMAP ==========
            roadmap_words = ['roadmap', 'road map', 'learning path', 'how to become', 'path to become', 'become a', 'how to learn', 'study path', 'learning roadmap', 'guide to become', 'show me roadmap', 'show roadmap']
            if any(word in message for word in roadmap_words):
                career_mapping = {
                    'mern': 'mern stack',
                    'mern stack': 'mern stack',
                    'web development': 'web development',
                    'web developer': 'web development',
                    'software engineering': 'software engineering',
                    'software engineer': 'software engineering',
                    'data science': 'data science',
                    'data scientist': 'data science',
                    'ai/ml': 'ai/ml engineering',
                    'ai engineer': 'ai/ml engineering',
                    'ml engineer': 'ai/ml engineering',
                    'machine learning': 'ai/ml engineering',
                    'devops': 'devops engineering',
                    'cloud computing': 'cloud computing',
                    'cloud engineer': 'cloud computing',
                    'flutter': 'flutter mobile development',
                    'cybersecurity': 'cybersecurity',
                    'security': 'cybersecurity',
                    'full stack': 'web development',
                    'frontend': 'web development',
                    'backend': 'web development',
                    'python': 'python development',
                    'django': 'python development',
                    'react': 'web development',
                    'node': 'web development'
                }
                
                detected_career = None
                message_lower = message.lower()
                
                for key, mapped_career in career_mapping.items():
                    if key in message_lower:
                        detected_career = mapped_career
                        break
                
                if not detected_career:
                    for roadmap_key in knowledge_base.roadmaps.keys():
                        if roadmap_key in message_lower or message_lower in roadmap_key:
                            detected_career = roadmap_key
                            break
                
                if detected_career:
                    roadmap = knowledge_base.get_roadmap(detected_career)
                    if roadmap and roadmap.get('steps'):
                        return {
                            'status': 'success',
                            'ai_response': {
                                'text': f"🗺️ Here's the learning roadmap for {detected_career.title()}. Check the sidebar for details!",
                                'timestamp': datetime.now().isoformat()
                            },
                            'suggested_questions': [],
                            'intent': 'show_roadmap',
                            'data': {'career': detected_career, 'roadmap': roadmap}
                        }
                    else:
                        return {
                            'status': 'success',
                            'ai_response': {
                                'text': f"🗺️ Here's a learning roadmap for {detected_career.title()}:\n\n• Learn fundamentals (2-3 months)\n• Build projects (2-3 months)\n• Get certified (1-2 months)\n• Apply for jobs (1 month)\n\nWant me to create a detailed monthly plan?",
                                'timestamp': datetime.now().isoformat()
                            },
                            'suggested_questions': [],
                            'intent': 'show_roadmap',
                            'data': {
                                'career': detected_career,
                                'roadmap': {
                                    'title': detected_career.title(),
                                    'duration': '6-8 months',
                                    'steps': [
                                        'Learn fundamentals (2-3 months)',
                                        'Build projects (2-3 months)',
                                        'Get certified (1-2 months)',
                                        'Apply for jobs (1 month)'
                                    ]
                                }
                            }
                        }
                else:
                    return {
                        'status': 'success',
                        'ai_response': {
                            'text': "Which career roadmap would you like to see? I have detailed roadmaps for:\n• Software Engineering\n• Web Development\n• Data Science\n• DevOps\n• Cloud Computing\n• AI/ML\n• Flutter Development\n• Cybersecurity\n• Python Development\n• MERN Stack\n\nJust ask like 'Show me roadmap for Data Science'",
                            'timestamp': datetime.now().isoformat()
                        },
                        'suggested_questions': [],
                        'intent': 'roadmap_prompt'
                    }

            # ========== INTENT 6: SKILLS ==========
            skill_words = ['skill', 'skills', 'what to learn', 'important skills', 'hot skills', 'trending skills', 'which skills', 'best skills', 'skills to learn', 'skills needed', 'what skills', 'in-demand']
            if any(word in message for word in skill_words):
                domains = ['web development', 'data science', 'ai/ml', 'cloud', 'devops', 'python', 'javascript', 'react', 'flutter', 'cybersecurity', 'mern', 'frontend', 'backend']
                detected_domain = None
                for domain in domains:
                    if domain in message:
                        detected_domain = domain
                        break

                if detected_domain:
                    skills = knowledge_base.get_skills_for_domain(detected_domain)
                    if skills:
                        return {
                            'status': 'success',
                            'ai_response': {
                                'text': f"📚 Here are the important skills for {detected_domain.title()}. Check the sidebar for details!",
                                'timestamp': datetime.now().isoformat()
                            },
                            'suggested_questions': [],
                            'intent': 'show_skills',
                            'data': {'domain': detected_domain, 'skills': skills}
                        }

                all_skills = knowledge_base.get_skills()
                return {
                    'status': 'success',
                    'ai_response': {
                        'text': "📚 Here are the most in-demand skills in Pakistan. Check the sidebar for details!",
                        'timestamp': datetime.now().isoformat()
                    },
                    'suggested_questions': [],
                    'intent': 'show_skills',
                    'data': {'domain': 'Tech Industry', 'skills': ', '.join(all_skills[:15])}
                }

            # ========== INTENT 7: CAREER RECOMMENDATIONS ==========
            career_words = ['career', 'carrer', 'carrear', 'which career', 'what career', 'recommend career', 'best career', 'career option', 'career choice', 'career should', 'choose career', 'career for me', 'job', 'profession', 'field']
            if any(word in message for word in career_words):
                recommendations = knowledge_base.get_recommendations()
                if recommendations:
                    return {
                        'status': 'success',
                        'ai_response': {
                            'text': "📋 Here are the top career paths in Pakistan's tech industry. Check the sidebar for details!",
                            'timestamp': datetime.now().isoformat()
                        },
                        'suggested_questions': [],
                        'intent': 'show_recommendations',
                        'data': {'recommendations': recommendations}
                    }

            # ========== FALLBACK ==========
            return {
                'status': 'success',
                'ai_response': {
                    'text': "I can help you with:\n\n• **Career recommendations** - Ask 'Which career should I choose?'\n• **Skills information** - Ask 'What skills are important to learn?'\n• **Learning roadmaps** - Ask 'Show me roadmap for MERN Stack'\n• **Resume tips** - Ask 'Give me resume tips'\n• **Salary guides** - Ask 'What is the salary?'\n• **Freelancing** - Ask 'How to start freelancing?'\n• **Interview prep** - Ask 'How to prepare for interview?'\n\nWhat would you like to know?",
                    'timestamp': datetime.now().isoformat()
                },
                'suggested_questions': [],
                'intent': 'fallback'
            }

        # ============= HEALTH CHECK =============
        elif action == 'health':
            return {
                'status': 'success',
                'questions_loaded': len(knowledge_base.qa_database),
                'skills_loaded': len(knowledge_base.skills_list),
                'careers_loaded': len(knowledge_base.recommendations),
                'roadmaps_loaded': len(knowledge_base.roadmaps),
                'institutes_loaded': len(knowledge_base.institutes_list)
            }

        else:
            return {'status': 'error', 'message': f'Unknown action: {action}'}

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {'status': 'error', 'message': str(e)}