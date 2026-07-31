"""
Wellness Controller - Simplified controller for direct use
"""
import logging
from typing import Dict, Optional

# WellnessInput lives in wellness_module, NOT in models.wellness
from wellness.wellness_module import get_wellness_coach, WellnessInput
from services.wellness_service import WellnessService

logger = logging.getLogger(__name__)


class WellnessController:
    """Simplified controller for wellness operations"""

    def __init__(self):
        self.coach   = get_wellness_coach()
        self.service = None

    def init_with_db(self, db_session):
        """Initialize with database session"""
        self.service = WellnessService()
        self.db      = db_session

    def process_checkin(self, user_id: int, data: Dict) -> Dict:
        """
        Process a wellness check-in.
        Saves to DB if service is available, otherwise returns analysis only.
        """
        wellness_input = WellnessInput.from_dict(data)

        if self.service:
            validated_data = {
                'mood':         wellness_input.mood,
                'stress':       wellness_input.stress,
                'sleep':        wellness_input.sleep,
                'energy':       wellness_input.energy,
                'productivity': wellness_input.productivity,
                'message':      wellness_input.message
            }
            return self.service.create_checkin(user_id, validated_data)

        return self.coach.wellness_coach(wellness_input)

    def get_wellness_analysis(self, data: Dict) -> Dict:
        """Get wellness analysis without saving to DB."""
        wellness_input = WellnessInput.from_dict(data)
        return self.coach.wellness_coach(wellness_input)

    def analyze_text(self, text: str) -> Dict:
        """Analyze text sentiment and emotion."""
        if not text:
            return {
                'sentiment': {'label': 'NEUTRAL', 'score': 0.5},
                'emotion':   {'label': 'neutral',  'score': 0.5}
            }
        return {
            'sentiment': self.coach.analyze_sentiment(text),
            'emotion':   self.coach.analyze_emotion(text)
        }

    def get_recommendations(self, data: Dict) -> Dict:
        """Get personalized recommendations."""
        wellness_input = WellnessInput.from_dict(data)
        recommendations, sentiment, emotion = self.coach.generate_recommendations(wellness_input)

        # Recommendations are rich dicts with 'title' and 'action' — not 'text'
        simple_list = [
            r.get('title', '') + ' — ' + r.get('action', '')
            for r in recommendations
        ]

        return {
            'recommendations':          simple_list,
            'detailed_recommendations': recommendations,
            'wellness_score':           self.coach.calculate_wellness_score(wellness_input),
            'burnout_risk':             self.coach.assess_burnout_risk(wellness_input),
            'sentiment':                sentiment,
            'emotion':                  emotion
        }

    def calculate_wellness_score(self, data: Dict) -> Dict:
        """Calculate wellness score and burnout risk only."""
        wellness_input = WellnessInput.from_dict(data)
        return {
            'wellness_score': self.coach.calculate_wellness_score(wellness_input),
            'burnout_risk':   self.coach.assess_burnout_risk(wellness_input)
        }


_controller: Optional[WellnessController] = None


def get_wellness_controller() -> WellnessController:
    """Get or create the global WellnessController instance"""
    global _controller
    if _controller is None:
        _controller = WellnessController()
    return _controller


wellness_controller = get_wellness_controller()