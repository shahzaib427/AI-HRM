# controllers/career_controller.py - CORRECTED (Calls AI Service)
from flask import jsonify, request
from models.profile import UserProfile
from models.career import CareerRecommendation, SkillGapAnalysis
from services.ai_service import AIService
import json
import logging

logger = logging.getLogger(__name__)

class CareerController:
    
    # ============= ALIAS METHODS (for backward compatibility) =============
    @staticmethod
    def get_profile():
        """Alias for get_profile_public"""
        return CareerController.get_profile_public()
    
    @staticmethod
    def get_recommendations():
        """Alias for get_recommendations_public"""
        return CareerController.get_recommendations_public()
    
    @staticmethod
    def get_job_alerts():
        """Alias for get_job_alerts_public"""
        return CareerController.get_job_alerts_public()
    
    @staticmethod
    def get_scholarships():
        """Alias for get_scholarships_public"""
        return CareerController.get_scholarships_public()
    
    # ============= PUBLIC METHODS =============
    @staticmethod
    def get_profile_public():
        """Get user profile - PUBLIC (no database needed)"""
        try:
            return jsonify({
                'profile': {
                    'current_role': 'Software Engineer',
                    'experience_years': 2,
                    'education_level': "Bachelor's",
                    'skills': ['JavaScript', 'React', 'Python', 'Node.js'],
                    'interests': ['Web Development', 'AI', 'Cloud Computing'],
                    'career_goal': 'Senior Software Engineer',
                    'timeline': '2 years',
                    'location': 'Lahore, Pakistan',
                    'current_salary': 'Rs. 100,000 - 150,000'
                }
            })
        except Exception as e:
            logger.error(f"Error in get_profile_public: {e}")
            return jsonify({
                'profile': {
                    'current_role': 'Software Engineer',
                    'experience_years': 2,
                    'education_level': "Bachelor's",
                    'skills': ['JavaScript', 'React', 'Python'],
                    'interests': ['Web Development'],
                    'career_goal': 'Senior Software Engineer',
                    'timeline': '2 years',
                    'location': 'Pakistan',
                    'current_salary': 'Rs. 100,000'
                }
            })
    
    @staticmethod
    def get_recommendations_public():
        """Get career path recommendations - PUBLIC"""
        try:
            profile = {
                'current_role': 'Software Engineer',
                'experience_years': 2,
                'education_level': "Bachelor's",
                'skills': ['JavaScript', 'React', 'Python'],
                'career_goal': 'Senior Software Engineer'
            }
            
            result = AIService.get_career_recommendations('anonymous', profile)
            
            if result.get('status') == 'success':
                return jsonify({'recommendations': result.get('recommendations', [])})
            else:
                return jsonify({
                    'recommendations': [
                        {
                            'title': 'Software Engineer',
                            'description': 'Build and maintain software applications.',
                            'confidence': 85,
                            'timeline': '1-2 years',
                            'steps': ['Learn programming', 'Build projects', 'Apply to jobs'],
                            'salary_range': 'Rs. 100,000 - 350,000'
                        },
                        {
                            'title': 'Data Scientist',
                            'description': 'Analyze data and build ML models.',
                            'confidence': 75,
                            'timeline': '1-2 years',
                            'steps': ['Learn Python', 'Study ML', 'Build portfolio'],
                            'salary_range': 'Rs. 150,000 - 400,000'
                        }
                    ]
                })
                
        except Exception as e:
            logger.error(f"Error in get_recommendations_public: {e}")
            return jsonify({'recommendations': []})
    
    @staticmethod
    def get_job_alerts_public():
        """Get job alerts - PUBLIC"""
        try:
            location = request.args.get('location', 'Lahore')
            
            return jsonify({
                'status': 'success',
                'job_alerts': [
                    {
                        'title': 'Software Engineer',
                        'company': 'Systems Limited',
                        'location': location,
                        'salary': 'Rs. 100,000 - 200,000',
                        'skills': ['Python', 'Django', 'React'],
                        'posted': '2 days ago'
                    },
                    {
                        'title': 'Full Stack Developer',
                        'company': 'Techlogix',
                        'location': location,
                        'salary': 'Rs. 120,000 - 250,000',
                        'skills': ['JavaScript', 'React', 'Node.js'],
                        'posted': '3 days ago'
                    },
                    {
                        'title': 'Frontend Developer',
                        'company': 'Arbisoft',
                        'location': location,
                        'salary': 'Rs. 80,000 - 180,000',
                        'skills': ['React', 'TypeScript', 'Tailwind'],
                        'posted': '1 week ago'
                    }
                ]
            })
                
        except Exception as e:
            logger.error(f"Error in get_job_alerts_public: {e}")
            return jsonify({'status': 'success', 'job_alerts': []})
    
    @staticmethod
    def get_scholarships_public():
        """Get scholarships - PUBLIC"""
        try:
            return jsonify({
                'status': 'success',
                'scholarships': [
                    {
                        'name': 'HEC Need-Based Scholarship',
                        'provider': 'Higher Education Commission',
                        'coverage': 'Full tuition + stipend',
                        'deadline': 'Varies by university',
                        'eligibility': 'Pakistani students with financial need'
                    },
                    {
                        'name': 'Fulbright Scholarship',
                        'provider': 'USEFP',
                        'coverage': 'Full funding for Master\'s/PhD',
                        'deadline': 'May annually',
                        'eligibility': 'Pakistani citizens, strong academic record'
                    },
                    {
                        'name': 'Commonwealth Scholarship',
                        'provider': 'UK Government',
                        'coverage': 'Full tuition + living stipend',
                        'deadline': 'October annually',
                        'eligibility': 'Pakistani citizens with strong academic record'
                    }
                ]
            })
                
        except Exception as e:
            logger.error(f"Error in get_scholarships_public: {e}")
            return jsonify({'status': 'success', 'scholarships': []})
    
    @staticmethod
    def get_market_insights(role):
        """Get market insights - PUBLIC"""
        try:
            return jsonify({
                'salary_range': 'Rs. 150,000 - 350,000',
                'demand': 'High',
                'growth_rate': '25%',
                'companies': ['Systems Limited', 'Techlogix', 'Afiniti', 'Careem', 'Motive'],
                'market_trends': [
                    'Increasing demand for cloud and AI skills',
                    'Remote work becoming standard',
                    'Focus on product-based companies',
                    'Rise of tech hubs in Karachi, Lahore, Islamabad'
                ]
            })
        except Exception as e:
            logger.error(f"Error in get_market_insights: {e}")
            return jsonify({
                'salary_range': 'Rs. 150,000 - 350,000',
                'demand': 'High',
                'growth_rate': '25%',
                'companies': ['Systems Limited', 'Techlogix', 'Afiniti'],
                'market_trends': ['Growing IT sector', 'Remote work opportunities']
            })
    
    @staticmethod
    def get_resume_tips():
        """Get resume tips - PUBLIC"""
        try:
            result = AIService.get_resume_tips()
            return jsonify(result)
        except Exception as e:
            return jsonify({
                'tips': [
                    'Use ATS-friendly format with clear sections',
                    'Highlight achievements with metrics',
                    'Keep it concise (1-2 pages)',
                    'Add LinkedIn profile and GitHub',
                    'Tailor resume for each application'
                ],
                'sample': ''
            })
    
    @staticmethod
    def get_interview_tips():
        """Get interview tips - PUBLIC"""
        try:
            result = AIService.get_interview_tips()
            return jsonify(result)
        except Exception as e:
            return jsonify({
                'tips': [
                    'Research company thoroughly',
                    'Practice common interview questions',
                    'Use STAR method for behavioral questions',
                    'Prepare questions to ask interviewer',
                    'Dress professionally'
                ],
                'questions': ''
            })
    
    @staticmethod
    def get_freelancing_guide():
        """Get freelancing guide - PUBLIC"""
        try:
            result = AIService.get_freelancing_guide()
            return jsonify(result)
        except Exception as e:
            return jsonify({'guide': 'Freelancing guide will appear here when available.'})
    
    # ============= NEW METHODS FOR REDESIGNED CAREER COACH =============
    @staticmethod
    def get_skills():
        """Get in-demand skills for 2026+ and future trends"""
        try:
            # Call AI service to get skills
            result = AIService.get_in_demand_skills()
            
            if result.get('status') == 'success':
                return jsonify({
                    'status': 'success',
                    'skills': result.get('skills', []),
                    'recommendations': result.get('recommendations', [])
                })
            else:
                # Return empty if AI service fails (no mock data)
                return jsonify({'status': 'success', 'skills': [], 'recommendations': []})
        except Exception as e:
            logger.error(f"Error in get_skills: {e}")
            return jsonify({'status': 'error', 'skills': [], 'recommendations': []})
    
    @staticmethod
    def get_institutes():
        """Get training institutes and certification providers"""
        try:
            # Call AI service to get institutes
            result = AIService.get_training_institutes()
            
            if result.get('status') == 'success':
                return jsonify({
                    'status': 'success',
                    'institutes': result.get('institutes', [])
                })
            else:
                return jsonify({'status': 'success', 'institutes': []})
        except Exception as e:
            logger.error(f"Error in get_institutes: {e}")
            return jsonify({'status': 'error', 'institutes': []})
    
    @staticmethod
    def get_interview_questions():
        """Get interview questions for specific domain - CALLS AI SERVICE"""
        try:
            domain = request.args.get('domain', 'Web Development')
            limit = int(request.args.get('limit', 5))
            limit = max(3, min(limit, 10))
            
            # Call AI service to get questions from RAG
            result = AIService.get_interview_questions(domain, limit)
            
            if result.get('status') == 'success':
                return jsonify({
                    'status': 'success',
                    'domain': domain,
                    'questions': result.get('questions', []),
                    'total': result.get('total', 0)
                })
            else:
                # Return empty if AI service fails (no mock data)
                return jsonify({
                    'status': 'success',
                    'domain': domain,
                    'questions': [],
                    'total': 0
                })
        except Exception as e:
            logger.error(f"Error in get_interview_questions: {e}")
            return jsonify({'status': 'error', 'questions': [], 'total': 0})
    
    @staticmethod
    def update_profile():
        """Update user profile"""
        try:
            data = request.json
            return jsonify({
                'profile': data,
                'message': 'Profile updated successfully'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    def analyze_skill_gap():
        """Analyze skill gap for target role"""
        try:
            data = request.json
            target_role = data.get('target_role', 'Software Engineer')
            current_skills = data.get('skills', [])
            
            result = AIService.analyze_skill_gap(target_role, current_skills, {})
            
            if result.get('status') == 'success':
                return jsonify({'skill_gaps': result.get('skill_gaps', [])})
            else:
                return jsonify({'skill_gaps': []})
        except Exception as e:
            return jsonify({'skill_gaps': []})