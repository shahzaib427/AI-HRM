# ai/wellness/wellness_module.py
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from transformers import pipeline
from datetime import datetime
import warnings
import logging

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class WellnessInput:
    mood: int          # 1–5
    stress: int        # 1–10
    sleep: int         # hours
    energy: int        # 1–10
    productivity: int  # 1–10
    message: str       # user text
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create WellnessInput from dictionary"""
        return cls(
            mood=int(data.get('mood', 3)),
            stress=int(data.get('stress', 5)),
            sleep=float(data.get('sleep', 7)),
            energy=int(data.get('energy', 5)),
            productivity=int(data.get('productivity', 5)),
            message=data.get('message', '')
        )

class WellnessCoach:
    def __init__(self):
        self.sentiment_model = None
        self.emotion_model = None
        self.models_loaded = False
        self.load_models()
    
    def load_models(self):
        """Load AI models with error handling"""
        print("Loading Wellness AI models...")
        try:
            # Try to load sentiment analysis model
            try:
                self.sentiment_model = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english"
                )
                print("✅ Sentiment analysis model loaded")
            except Exception as e:
                logger.warning(f"Could not load sentiment model: {e}")
                self.sentiment_model = None
            
            # Try to load emotion detection model
            try:
                self.emotion_model = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base"
                )
                print("✅ Emotion detection model loaded")
            except Exception as e:
                logger.warning(f"Could not load emotion model: {e}")
                self.emotion_model = None
            
            self.models_loaded = self.sentiment_model is not None or self.emotion_model is not None
            if self.models_loaded:
                print("✅ Wellness models loaded successfully")
            else:
                print("⚠️ No AI models loaded - using rule-based fallback")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self.models_loaded = False
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        if self.sentiment_model and text:
            try:
                result = self.sentiment_model(text)[0]
                return {
                    'label': result['label'],
                    'score': result['score']
                }
            except Exception as e:
                logger.error(f"Sentiment analysis error: {e}")
        
        return {'label': 'NEUTRAL', 'score': 0.5}
    
    def analyze_emotion(self, text: str) -> Dict[str, Any]:
        """Analyze emotion from text"""
        if self.emotion_model and text:
            try:
                result = self.emotion_model(text)[0]
                return {
                    'label': result['label'],
                    'score': result['score']
                }
            except Exception as e:
                logger.error(f"Emotion analysis error: {e}")
        
        return {'label': 'neutral', 'score': 0.5}
    
    def calculate_wellness_score(self, data: WellnessInput) -> float:
        """Calculate overall wellness score (0-100)"""
        mood_score = data.mood * 20                    # 20-100
        stress_score = (10 - data.stress) * 10         # 0-90 (inverted)
        sleep_score = min(data.sleep * 10, 100)        # 0-100 (capped)
        energy_score = data.energy * 10                 # 10-100
        productivity_score = data.productivity * 10     # 10-100
        
        # Weighted average (stress has higher impact)
        weights = {
            'mood': 0.25,
            'stress': 0.30,
            'sleep': 0.20,
            'energy': 0.15,
            'productivity': 0.10
        }
        
        total = (mood_score * weights['mood'] +
                stress_score * weights['stress'] +
                sleep_score * weights['sleep'] +
                energy_score * weights['energy'] +
                productivity_score * weights['productivity'])
        
        return round(total, 1)
    
    def assess_burnout_risk(self, data: WellnessInput) -> Dict[str, Any]:
        """Assess burnout risk level with detailed analysis"""
        risk_points = 0
        risk_factors = []
        
        # Stress assessment
        if data.stress > 7:
            risk_points += 2
            risk_factors.append({"factor": "high stress", "severity": "severe", "points": 2})
        elif data.stress > 5:
            risk_points += 1
            risk_factors.append({"factor": "moderate stress", "severity": "moderate", "points": 1})
        
        # Sleep assessment
        if data.sleep < 5:
            risk_points += 2
            risk_factors.append({"factor": "severe sleep deprivation", "severity": "severe", "points": 2})
        elif data.sleep < 7:
            risk_points += 1
            risk_factors.append({"factor": "insufficient sleep", "severity": "moderate", "points": 1})
        
        # Energy assessment
        if data.energy < 4:
            risk_points += 2
            risk_factors.append({"factor": "very low energy", "severity": "severe", "points": 2})
        elif data.energy < 6:
            risk_points += 1
            risk_factors.append({"factor": "low energy", "severity": "moderate", "points": 1})
        
        # Productivity assessment
        if data.productivity < 4:
            risk_points += 1
            risk_factors.append({"factor": "low productivity", "severity": "moderate", "points": 1})
        
        # Mood assessment
        if data.mood < 3:
            risk_points += 1
            risk_factors.append({"factor": "poor mood", "severity": "moderate", "points": 1})
        
        # Determine risk level
        if risk_points >= 6:
            risk_level = "CRITICAL"
            risk_color = "red"
            action_needed = "Immediate action required. Consider taking time off and seeking support."
        elif risk_points >= 4:
            risk_level = "HIGH"
            risk_color = "orange"
            action_needed = "High risk. Implement stress management techniques and prioritize self-care."
        elif risk_points >= 2:
            risk_level = "MEDIUM"
            risk_color = "yellow"
            action_needed = "Moderate risk. Monitor your well-being and take preventive measures."
        else:
            risk_level = "LOW"
            risk_color = "green"
            action_needed = "Low risk. Maintain healthy habits and continue regular self-care."
        
        return {
            "level": risk_level,
            "color": risk_color,
            "score": risk_points,
            "factors": risk_factors,
            "action_needed": action_needed
        }
    
    def generate_recommendations(self, data: WellnessInput) -> tuple:
        """Generate personalized recommendations"""
        recommendations = []
        
        # Get AI analysis
        sentiment = self.analyze_sentiment(data.message)
        emotion = self.analyze_emotion(data.message)
        
        current_hour = datetime.now().hour
        
        # 1. Stress-based recommendations
        if data.stress >= 8:
            recommendations.append({
                "text": "🧘 Take a 10-minute mindfulness break - deep breathing can help reduce stress",
                "type": "meditation",
                "priority": "high",
                "duration": "10 mins",
                "category": "stress"
            })
        elif data.stress >= 6:
            recommendations.append({
                "text": "🎵 Listen to calming music or try a 5-minute guided meditation",
                "type": "meditation", 
                "priority": "medium",
                "duration": "5 mins",
                "category": "stress"
            })
        
        # 2. Sleep-based recommendations
        if data.sleep < 6:
            recommendations.append({
                "text": "😴 Aim for 7-8 hours of sleep tonight - avoid screens 1 hour before bed",
                "type": "sleep",
                "priority": "high",
                "duration": "ongoing",
                "category": "sleep"
            })
        elif data.sleep < 7:
            recommendations.append({
                "text": "🌙 Try to sleep 30 minutes earlier tonight for better rest",
                "type": "sleep",
                "priority": "medium",
                "duration": "ongoing",
                "category": "sleep"
            })
        
        # 3. Energy-based recommendations
        if data.energy < 4:
            recommendations.append({
                "text": "⚡ Quick energy boost: Stand up, stretch, and take 10 deep breaths",
                "type": "exercise",
                "priority": "high",
                "duration": "2 mins",
                "category": "energy"
            })
        elif data.energy < 6:
            recommendations.append({
                "text": "🚶 Go for a 10-minute walk to refresh your mind and body",
                "type": "exercise",
                "priority": "medium",
                "duration": "10 mins",
                "category": "energy"
            })
        
        # 4. Mood-based recommendations
        if data.mood <= 2:
            recommendations.append({
                "text": "💬 Connect with a friend or family member - social connection boosts mood",
                "type": "social",
                "priority": "high",
                "duration": "15 mins",
                "category": "mood"
            })
        elif data.mood <= 3:
            recommendations.append({
                "text": "📝 Write down 3 things you're grateful for right now",
                "type": "journaling",
                "priority": "medium",
                "duration": "5 mins",
                "category": "mood"
            })
        
        # 5. Productivity-based recommendations
        if data.productivity < 4:
            recommendations.append({
                "text": "🎯 Break your tasks into smaller chunks - focus on one thing at a time",
                "type": "productivity",
                "priority": "high",
                "duration": "ongoing",
                "category": "productivity"
            })
        
        # 6. AI Sentiment-based recommendations
        if sentiment['label'] == 'NEGATIVE':
            recommendations.append({
                "text": "💭 Practice positive affirmations: 'I am capable and resilient'",
                "type": "mindset",
                "priority": "medium",
                "duration": "2 mins",
                "category": "mental"
            })
        
        # 7. AI Emotion-based recommendations
        emotion_recs = {
            'sadness': {
                "text": "🎬 Watch something funny or uplifting - laughter is great medicine",
                "type": "entertainment",
                "priority": "low",
                "duration": "20 mins",
                "category": "emotional"
            },
            'anger': {
                "text": "💪 Release tension with physical exercise or punch a pillow safely",
                "type": "exercise",
                "priority": "medium",
                "duration": "10 mins",
                "category": "emotional"
            },
            'fear': {
                "text": "🧘 Practice grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste",
                "type": "mindfulness",
                "priority": "high",
                "duration": "3 mins",
                "category": "emotional"
            },
            'joy': {
                "text": "✨ Share your positive energy - compliment someone or spread kindness",
                "type": "social",
                "priority": "low",
                "duration": "5 mins",
                "category": "emotional"
            },
            'love': {
                "text": "💖 Express appreciation to someone special in your life",
                "type": "social",
                "priority": "low",
                "duration": "5 mins",
                "category": "emotional"
            },
            'surprise': {
                "text": "🎨 Channel that energy into something creative",
                "type": "creative",
                "priority": "low",
                "duration": "15 mins",
                "category": "emotional"
            }
        }
        
        emotion_label = emotion['label'].lower()
        if emotion_label in emotion_recs:
            recommendations.append(emotion_recs[emotion_label])
        
        # 8. Time-specific recommendations
        if current_hour < 12 and data.energy < 6:
            recommendations.append({
                "text": "☀️ Start your day with a healthy breakfast and some sunlight",
                "type": "nutrition",
                "priority": "medium",
                "duration": "15 mins",
                "category": "routine"
            })
        elif current_hour > 20 and data.sleep < 7:
            recommendations.append({
                "text": "📖 Wind down with a book instead of screens for better sleep",
                "type": "sleep",
                "priority": "high",
                "duration": "20 mins",
                "category": "sleep"
            })
        elif 13 <= current_hour <= 15 and data.energy < 5:
            recommendations.append({
                "text": "☕ Take a proper lunch break away from your desk",
                "type": "break",
                "priority": "medium",
                "duration": "30 mins",
                "category": "rest"
            })
        
        # Remove duplicates (keep first occurrence)
        seen = set()
        unique_recs = []
        for rec in recommendations:
            if rec['text'] not in seen:
                seen.add(rec['text'])
                unique_recs.append(rec)
        
        # Sort by priority (high -> medium -> low)
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        unique_recs.sort(key=lambda x: priority_order[x['priority']])
        
        return unique_recs[:5], sentiment, emotion
    
    def wellness_coach(self, data: WellnessInput) -> Dict[str, Any]:
        """Main function to get complete wellness analysis"""
        score = self.calculate_wellness_score(data)
        risk = self.assess_burnout_risk(data)
        recommendations, sentiment, emotion = self.generate_recommendations(data)
        
        # Calculate category scores
        category_scores = {
            "physical": round((data.energy * 10 + data.sleep * 10) / 2, 1),
            "mental": round((data.productivity * 10 + (10 - data.stress) * 10) / 2, 1),
            "emotional": round(data.mood * 20, 1),
            "social": round((data.mood * 20 + (10 - data.stress) * 5) / 1.5, 1)
        }
        
        # Determine wellness level
        if score >= 80:
            wellness_level = "Excellent"
            wellness_color = "green"
        elif score >= 60:
            wellness_level = "Good"
            wellness_color = "lightgreen"
        elif score >= 40:
            wellness_level = "Moderate"
            wellness_color = "yellow"
        elif score >= 20:
            wellness_level = "Low"
            wellness_color = "orange"
        else:
            wellness_level = "Critical"
            wellness_color = "red"
        
        return {
            "wellness_score": score,
            "wellness_level": wellness_level,
            "wellness_color": wellness_color,
            "category_scores": category_scores,
            "burnout_risk": risk,
            "emotion": emotion['label'],
            "emotion_score": emotion['score'],
            "sentiment": sentiment['label'],
            "sentiment_score": sentiment['score'],
            "recommendations": [r['text'] for r in recommendations],
            "detailed_recommendations": recommendations,
            "input_data": {
                "mood": data.mood,
                "stress": data.stress,
                "sleep": data.sleep,
                "energy": data.energy,
                "productivity": data.productivity
            },
            "timestamp": datetime.now().isoformat()
        }

# Global instance
wellness_coach = WellnessCoach()

def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict wellness recommendations based on user data
    
    Expected data formats:
    1. Full assessment: {
        'mood': 4,
        'stress': 6,
        'sleep': 7.5,
        'energy': 5,
        'productivity': 6,
        'message': "I'm feeling stressed about work"
    }
    
    2. Quick check: {
        'action': 'quick_check',
        'mood': 3,
        'stress': 7
    }
    
    3. Get recommendations only: {
        'action': 'recommendations',
        'mood': 4,
        'stress': 5,
        'sleep': 6,
        'energy': 4,
        'productivity': 5
    }
    
    4. Analyze text: {
        'action': 'analyze_text',
        'message': "I'm feeling overwhelmed today"
    }
    
    Returns: {
        'status': 'success',
        'data': {...}
    }
    """
    try:
        action = data.get('action', 'full_assessment')
        
        if action == 'full_assessment':
            # Complete wellness assessment
            wellness_input = WellnessInput.from_dict(data)
            result = wellness_coach.wellness_coach(wellness_input)
            return {
                'status': 'success',
                'data': result
            }
        
        elif action == 'quick_check':
            # Quick wellness check with minimal data
            mood = data.get('mood', 3)
            stress = data.get('stress', 5)
            
            # Simple score calculation
            wellness_score = ((mood * 20) + ((10 - stress) * 10)) / 2
            
            return {
                'status': 'success',
                'data': {
                    'wellness_score': round(wellness_score, 1),
                    'mood': mood,
                    'stress': stress,
                    'recommendation': "Take a few deep breaths and take a short break" if stress > 7 else "Keep up the good work!"
                }
            }
        
        elif action == 'recommendations':
            # Generate recommendations only
            wellness_input = WellnessInput.from_dict(data)
            recommendations, _, _ = wellness_coach.generate_recommendations(wellness_input)
            return {
                'status': 'success',
                'data': {
                    'recommendations': [r['text'] for r in recommendations],
                    'detailed': recommendations
                }
            }
        
        elif action == 'analyze_text':
            # Analyze text sentiment and emotion
            message = data.get('message', '')
            if not message:
                return {
                    'status': 'error',
                    'message': 'No message provided for analysis'
                }
            
            sentiment = wellness_coach.analyze_sentiment(message)
            emotion = wellness_coach.analyze_emotion(message)
            
            return {
                'status': 'success',
                'data': {
                    'sentiment': sentiment,
                    'emotion': emotion,
                    'message_length': len(message)
                }
            }
        
        elif action == 'status':
            # Get module status
            return {
                'status': 'success',
                'data': {
                    'models_loaded': wellness_coach.models_loaded,
                    'sentiment_model': wellness_coach.sentiment_model is not None,
                    'emotion_model': wellness_coach.emotion_model is not None,
                    'timestamp': datetime.now().isoformat()
                }
            }
        
        else:
            return {
                'status': 'error',
                'message': f'Unknown action: {action}. Available actions: full_assessment, quick_check, recommendations, analyze_text, status'
            }
            
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }

# For testing the module directly
if __name__ == "__main__":
    # Test full assessment
    test_data = {
        'action': 'full_assessment',
        'mood': 3,
        'stress': 7,
        'sleep': 6,
        'energy': 4,
        'productivity': 5,
        'message': "I'm feeling overwhelmed with work deadlines"
    }
    result = predict(test_data)
    print("Full Assessment Result:")
    print(result)
    
    # Test quick check
    quick_data = {
        'action': 'quick_check',
        'mood': 4,
        'stress': 8
    }
    quick_result = predict(quick_data)
    print("\nQuick Check Result:")
    print(quick_result)