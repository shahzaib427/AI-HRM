"""
wellness_module.py — WellnessCoach with rich, context-aware AI recommendations
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ── Data class ────────────────────────────────────────────────────────────────

@dataclass
class WellnessInput:
    mood:         int   = 3      # 1-5
    stress:       int   = 5      # 1-10  (higher = worse)
    sleep:        float = 7.0    # hours
    energy:       int   = 5      # 1-10
    productivity: int   = 5      # 1-10
    message:      str   = ""

    @classmethod
    def from_dict(cls, d: Dict) -> "WellnessInput":
        return cls(
            mood         = int(d.get("mood",         3)),
            stress       = int(d.get("stress",       5)),
            sleep        = float(d.get("sleep",      7.0)),
            energy       = int(d.get("energy",       5)),
            productivity = int(d.get("productivity", 5)),
            message      = str(d.get("message",      "")),
        )


# ── Recommendation catalogue ──────────────────────────────────────────────────
# Each entry is a callable(input) → dict | None
# Returning None means the rule doesn't apply for this input.

def _r(title, description, action, impact, icon, priority, duration=None):
    return {
        "title":       title,
        "description": description,
        "action":      action,
        "impact":      impact,
        "icon":        icon,
        "priority":    priority,   # "high" | "medium" | "low"
        "duration":    duration,
    }


# ── Rule functions ─────────────────────────────────────────────────────────────

def _rule_critical_burnout(inp: WellnessInput):
    if inp.stress >= 8 and inp.energy <= 3 and inp.mood <= 2:
        return _r(
            "🚨 Immediate Burnout Intervention",
            "Your combined stress, energy, and mood signals indicate acute burnout. This requires urgent action — not later, now.",
            "Block the next 90 minutes in your calendar. Notify your manager you are stepping back to recover. Do not open email. Lie down, walk outside, or call a trusted person.",
            "Prevents complete breakdown and accelerates recovery by 40–60%.",
            "🚨", "high", "90 min",
        )

def _rule_high_stress_sleep_ok(inp: WellnessInput):
    if inp.stress >= 7 and inp.sleep >= 6:
        return _r(
            "Stress Reset Protocol",
            f"Your stress is at {inp.stress}/10 — in the high zone. Your sleep is reasonable, so your nervous system has recovery capacity you're not using.",
            "Set a 5-minute timer right now. Close all tabs. Use box breathing: inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 6 cycles. Then write down the 3 things stressing you most and pick ONE to act on today.",
            "Reduces cortisol 23% within 5 minutes; sustained focus improves by 18% afterward.",
            "🧘", "high", "5–10 min"
        )

def _rule_high_stress_poor_sleep(inp: WellnessInput):
    if inp.stress >= 7 and inp.sleep < 6:
        return _r(
            "Stress-Sleep Spiral: Break It Today",
            f"Stress at {inp.stress}/10 and only {inp.sleep}h sleep is a compounding loop — poor sleep raises cortisol, raising stress, ruining the next night. You must interrupt this cycle.",
            "Tonight: hard stop all screens at 9:30 PM, room temperature to 18–20°C, write a 'done list' (not a to-do list) to offload mental load before bed. During the day: no caffeine after 1 PM.",
            "Breaking the stress-sleep loop improves mood 31% and cognitive function 27% within 3 nights.",
            "😴", "high", "Tonight"
        )

def _rule_low_sleep(inp: WellnessInput):
    if inp.sleep < 6 and inp.stress < 7:
        return _r(
            "Sleep Debt Recovery Plan",
            f"You slept {inp.sleep}h — below the 7h minimum your prefrontal cortex needs for decision-making. Even 1 night of under-sleeping reduces emotional regulation by 60%.",
            "Aim for 7.5h tonight. Set your alarm backward from when you need to wake up. Use the 10-3-2-1-0 rule: no caffeine 10h before bed, no alcohol 3h before, no food 2h before, no screens 1h before, 0 snooze hits.",
            "Recovering 1.5h of sleep improves mood by 25% and reaction time by 20% within 2 nights.",
            "😴", "high", "This evening"
        )

def _rule_excellent_sleep(inp: WellnessInput):
    if inp.sleep >= 8 and inp.energy >= 7:
        return _r(
            "Leverage Your Recovery Window",
            f"You slept {inp.sleep}h and energy is at {inp.energy}/10 — this is a peak performance day. Use it strategically.",
            "Front-load your hardest cognitive task into the first 90 minutes of your work session. Your working memory and focus are at their weekly high right now.",
            "Completing deep work in peak windows increases output quality by 50% vs. working tired.",
            "⚡", "low", "First 90 min of work"
        )

def _rule_low_energy_high_productivity(inp: WellnessInput):
    if inp.energy <= 4 and inp.productivity >= 6:
        return _r(
            "You're Running on Empty — Protect Yourself",
            f"Energy at {inp.energy}/10 but productivity at {inp.productivity}/10 means you're pushing through fatigue. This is unsustainable and leads to a harder crash.",
            "Schedule a 20-minute nap or complete rest before 3 PM. After that, work only on low-cognitive tasks (email, admin, reviews). Drink 500 ml of water now — dehydration mimics fatigue.",
            "A 20-minute nap restores alertness equivalent to 200mg caffeine without the crash.",
            "⚡", "high", "20 min rest"
        )

def _rule_low_energy_low_productivity(inp: WellnessInput):
    if inp.energy <= 4 and inp.productivity <= 4:
        return _r(
            "Energy & Output Are Both Down — Reset Mode",
            "Both energy and productivity are low. Forcing work in this state creates errors and frustration. You need a biological reset, not more effort.",
            "Do 10 minutes of brisk walking (outside if possible). Eat a protein-rich snack if you haven't eaten in 3+ hours. Then identify the ONE most important task and do only that for 25 minutes (Pomodoro).",
            "Physical movement increases dopamine and norepinephrine, boosting focus by 30% for 2–3 hours.",
            "🎯", "high", "10 min + 25 min"
        )

def _rule_good_energy_low_productivity(inp: WellnessInput):
    if inp.energy >= 7 and inp.productivity <= 4:
        return _r(
            "Energy Available — Unlock Your Focus",
            f"You have energy ({inp.energy}/10) but low productivity ({inp.productivity}/10). This often means distraction, unclear priorities, or low motivation — not fatigue.",
            "Use the 2-minute rule: write down everything in your head, then pick the task with the highest real impact. Eliminate all notifications for 45 minutes and work in a single window.",
            "Removing distractions with high energy increases deep work output by 70% in the next hour.",
            "🎯", "medium", "45 min focus block"
        )

def _rule_low_mood_message(inp: WellnessInput):
    keywords = ["overwhelm", "anxious", "anxiet", "depress", "sad", "hopeless", "exhaust", "burnout", "can't", "cannot", "struggling"]
    msg_lower = inp.message.lower()
    mood_low  = inp.mood <= 2
    has_kw    = any(k in msg_lower for k in keywords)

    if mood_low or has_kw:
        return _r(
            "Emotional Support: You're Not Alone",
            "Your check-in reflects emotional difficulty. Low moods are valid signals — not weaknesses. They are data about your current state, not your future trajectory.",
            "Name what you're feeling in one sentence (e.g. 'I feel overwhelmed because of deadlines'). Then do one micro-act of self-care: a warm drink, a 5-minute walk, or a message to a friend. If this persists 3+ days, please speak to a counsellor or your GP.",
            "Naming emotions reduces their intensity by up to 50% (affect labelling, UCLA neuroscience research).",
            "💛", "high", "5–10 min"
        )

def _rule_high_mood_stress(inp: WellnessInput):
    if inp.mood >= 4 and inp.stress >= 7:
        return _r(
            "Positive Mood — But Watch the Stress Load",
            f"Good mood ({inp.mood}/5) alongside high stress ({inp.stress}/10) sometimes means you're riding adrenaline. This feels productive but depletes reserves fast.",
            "Capitalise on your positive state but set a hard boundary: choose a stop time today and honour it. Add one genuine recovery activity (a real walk, not a scrolling break).",
            "Sustained adrenaline highs without recovery lead to 48h post-event fatigue crashes.",
            "⚖️", "medium", "End of day"
        )

def _rule_consistent_high_wellness(inp: WellnessInput):
    score = _calculate_score(inp)
    if score >= 80:
        return _r(
            "Peak State — Anchor These Habits",
            "Your wellness indicators are excellent across all dimensions. This is the result of consistent habits — protect them.",
            "Write down the 3 specific behaviours driving this (e.g. 'slept before 11 PM, ate lunch away from desk, no meetings after 4 PM'). Put them in your calendar as recurring blocks.",
            "Habit documentation increases consistency by 65% — you can recreate this state deliberately.",
            "🌟", "low", "10 min journalling"
        )

def _rule_moderate_stress(inp: WellnessInput):
    if 4 <= inp.stress <= 6:
        return _r(
            "Manage Mid-Level Stress Before It Compounds",
            f"Stress at {inp.stress}/10 is in the moderate zone — not alarming yet, but chronic moderate stress causes the same damage as acute high stress over time.",
            "Identify whether your stress is task-based (clear your backlog), people-based (have the conversation), or environment-based (change your setting). Then take one specific action on the root cause today.",
            "Addressing the stress source reduces it 3x more effectively than coping strategies alone.",
            "🌿", "medium", "15–30 min"
        )

def _rule_social_isolation(inp: WellnessInput):
    keywords = ["alone", "isolat", "lonely", "no one", "nobody", "by myself"]
    if any(k in inp.message.lower() for k in keywords) or (inp.mood <= 3 and inp.energy <= 4):
        return _r(
            "Connection Is a Wellness Pillar",
            "Social connection is as important to health as sleep and nutrition. Even small moments of genuine connection measurably improve mood and reduce cortisol.",
            "Send one message to a colleague, friend, or family member — not about work. Ask one genuine question and actually wait for the answer. Even a 5-minute conversation counts.",
            "Brief social interactions boost oxytocin and reduce stress hormones by 15–20% within minutes.",
            "🤝", "medium", "5 min"
        )

def _rule_nutrition_energy(inp: WellnessInput):
    if inp.energy <= 5 and inp.productivity <= 5:
        return _r(
            "Fuel Your Brain — Check Your Nutrition",
            "Low energy and productivity are frequently caused by blood sugar dips, dehydration, or skipped meals. Your brain uses 20% of your body's energy.",
            "Drink 400 ml of water right now. If your last meal was 3+ hours ago, eat a snack: nuts, a banana, yoghurt, or whole grain crackers with protein. Avoid ultra-processed snacks — they cause a spike-crash cycle.",
            "Proper hydration alone improves cognitive performance by 14%. Stable blood sugar prevents the 2–4 PM energy crash.",
            "🥗", "medium", "5 min"
        )

def _rule_movement_break(inp: WellnessInput):
    if inp.stress >= 5 or inp.energy <= 6:
        return _r(
            "Movement Break: Non-Negotiable Recovery",
            "Sitting for 2+ hours continuously spikes cortisol and reduces cognitive performance. A brief movement break reverses this rapidly.",
            "Stand up right now. Walk for 5–10 minutes — even around your building. If outdoors, look at the horizon (not your phone) for 2 minutes. On return, your stress will be measurably lower.",
            "A 10-minute walk reduces stress hormones by 15% and improves mood for up to 2 hours afterward.",
            "🚶", "medium", "10 min"
        )

def _rule_digital_detox(inp: WellnessInput):
    keywords = ["phone", "scroll", "social media", "screen", "distract", "notification"]
    if any(k in inp.message.lower() for k in keywords) or (inp.productivity <= 4 and inp.energy <= 5):
        return _r(
            "Digital Load Is Draining You",
            "Constant notifications and passive scrolling deplete cognitive resources equivalent to losing 10 IQ points — even when you're not actively engaging.",
            "Enable Do Not Disturb for the next 90 minutes. Delete social media apps from your home screen for today. Check messages at fixed times: 11 AM, 1 PM, 4 PM only.",
            "Batching digital communication reduces context-switching by 40% and increases deep work by 2.5 hours per day.",
            "📵", "medium", "90 min"
        )

def _rule_work_life_boundary(inp: WellnessInput):
    keywords = ["deadline", "overtime", "late", "weekend", "overwork", "too much", "too many meetings"]
    if any(k in inp.message.lower() for k in keywords) or (inp.stress >= 6 and inp.productivity <= 5):
        return _r(
            "Protect Your Recovery Boundaries",
            "Working beyond your capacity consistently produces fewer quality outputs than working within sustainable limits. More hours ≠ more results past a threshold.",
            "Define your hard stop time today (write it down). Communicate it once to relevant people. After that time, close the laptop physically. Plan one enjoyable non-work activity for this evening.",
            "Consistent work boundaries improve weekly productivity by 25% and reduce burnout risk by 60%.",
            "🏠", "high", "Today evening"
        )

def _rule_mindfulness(inp: WellnessInput):
    score = _calculate_score(inp)
    if 40 <= score <= 70:
        return _r(
            "Mindfulness Check-In: Reconnect With the Present",
            "A mid-range wellness score often reflects mental noise — a background hum of unfinished thoughts, worries, and unprocessed tension.",
            "Try a 3-minute body scan: close your eyes, notice sensations in feet → legs → torso → shoulders → face. Breathe slowly. This offloads the nervous system's background processing load.",
            "A 3-minute mindfulness practice reduces mental fatigue and improves focus onset for the next task by 22%.",
            "🧠", "low", "3 min"
        )

def _rule_gratitude(inp: WellnessInput):
    if inp.mood <= 3 and inp.stress >= 5:
        return _r(
            "Gratitude Practice: Rewire Stress Response",
            "When stress is high and mood is low, the brain's negativity bias amplifies problems and filters out positives. Gratitude practice literally rewires this filter.",
            "Write 3 specific things that went okay today — not 'my family', but 'my colleague helped me with the report and it saved 30 minutes'. Specificity is the key that activates the neural reward pathway.",
            "Daily gratitude practice reduces cortisol by 23% and improves sleep quality within 2 weeks.",
            "🙏", "low", "5 min"
        )

def _rule_physical_activity(inp: WellnessInput):
    keywords = ["exercise", "gym", "run", "walk", "sport", "workout", "sedentary", "sitting all day"]
    score = _calculate_score(inp)
    if score < 70 or any(k in inp.message.lower() for k in keywords):
        return _r(
            "Physical Activity as Medicine",
            "Exercise is the single most evidence-backed intervention for mood, energy, stress, sleep quality, and cognitive performance — simultaneously.",
            "You don't need a gym session. Aim for 20–30 minutes today: a brisk walk, cycling, or a home bodyweight circuit (10 squats, 10 push-ups, 10 lunges × 3). Even 15 minutes makes a measurable difference.",
            "30 minutes of moderate exercise improves mood for 12 hours, reduces stress by 48%, and improves sleep quality by 65%.",
            "🏃", "medium", "20–30 min"
        )

def _rule_hydration(inp: WellnessInput):
    if inp.energy <= 5:
        return _r(
            "Hydration Check: Simple But Powerful",
            "A 2% drop in body hydration reduces cognitive performance by 20%. Most people reach mid-afternoon in a dehydrated state without realising it.",
            "Drink 400–500 ml of water right now. Set a reminder every 90 minutes to drink a glass. If your urine is dark yellow, you are dehydrated — drink 1 litre over the next 2 hours.",
            "Staying hydrated improves concentration by 14%, reduces headaches by 50%, and prevents the mid-afternoon energy dip.",
            "💧", "medium", "Now + ongoing"
        )

def _rule_sleep_schedule(inp: WellnessInput):
    if inp.sleep < 7 or inp.energy <= 5:
        return _r(
            "Consistent Sleep Schedule: Your Biological Clock",
            "Irregular sleep times disrupt your circadian rhythm more than total sleep duration. Going to bed at wildly different times is like giving yourself mild jet lag every week.",
            "Choose a consistent wake time and stick to it 7 days a week — even weekends. Work backward to determine your target bedtime. Set both as recurring alarms. This single change improves sleep quality within 5–7 days.",
            "A consistent sleep schedule improves sleep quality by 30% and reduces time to fall asleep by 15 minutes within one week.",
            "🕙", "medium", "Starting tonight"
        )


# ── All rules in priority order ────────────────────────────────────────────────

ALL_RULES = [
    _rule_critical_burnout,
    _rule_high_stress_poor_sleep,
    _rule_high_stress_sleep_ok,
    _rule_low_mood_message,
    _rule_work_life_boundary,
    _rule_low_energy_low_productivity,
    _rule_low_energy_high_productivity,
    _rule_low_sleep,
    _rule_high_mood_stress,
    _rule_good_energy_low_productivity,
    _rule_social_isolation,
    _rule_digital_detox,
    _rule_movement_break,
    _rule_nutrition_energy,
    _rule_hydration,
    _rule_sleep_schedule,
    _rule_physical_activity,
    _rule_moderate_stress,
    _rule_mindfulness,
    _rule_gratitude,
    _rule_consistent_high_wellness,
    _rule_excellent_sleep,
]


# ── Scoring ────────────────────────────────────────────────────────────────────

def _calculate_score(inp: WellnessInput) -> int:
    mood_score        = (inp.mood / 5)        * 25
    energy_score      = (inp.energy / 10)     * 20
    stress_score      = ((10 - inp.stress) / 9) * 25
    sleep_hours       = max(0, min(inp.sleep, 10))
    sleep_score       = (min(sleep_hours, 9) / 9) * 15  if sleep_hours >= 5 else (sleep_hours / 5) * 8
    productivity_score = (inp.productivity / 10) * 15

    raw = mood_score + energy_score + stress_score + sleep_score + productivity_score
    return max(0, min(100, round(raw)))


def _category_scores(inp: WellnessInput) -> Dict:
    return {
        "physical":  min(100, round((inp.energy / 10 + min(inp.sleep / 9, 1)) / 2 * 100)),
        "mental":    min(100, round(((inp.productivity / 10) + ((10 - inp.stress) / 10)) / 2 * 100)),
        "emotional": min(100, round((inp.mood / 5) * 100)),
        "social":    min(100, round(((inp.mood / 5) + ((10 - inp.stress) / 10)) / 2 * 100)),
    }


# ── Burnout risk ───────────────────────────────────────────────────────────────

def _assess_burnout(inp: WellnessInput) -> Dict:
    points = 0
    if inp.stress >= 8:     points += 3
    elif inp.stress >= 6:   points += 2
    elif inp.stress >= 4:   points += 1

    if inp.energy <= 3:     points += 3
    elif inp.energy <= 5:   points += 2
    elif inp.energy <= 7:   points += 1

    if inp.mood <= 2:       points += 3
    elif inp.mood <= 3:     points += 2

    if inp.sleep < 5:       points += 3
    elif inp.sleep < 6:     points += 2
    elif inp.sleep < 7:     points += 1

    if inp.productivity <= 3: points += 2
    elif inp.productivity <= 5: points += 1

    if points >= 10:
        level, description = "CRITICAL", "Immediate intervention required. Burnout is active."
    elif points >= 7:
        level, description = "HIGH", "High burnout risk. Take recovery action today."
    elif points >= 4:
        level, description = "MEDIUM", "Moderate risk. Monitor closely and adjust workload."
    else:
        level, description = "LOW", "Burnout risk is low. Maintain your current habits."

    return {"level": level, "score": points, "description": description}


# ── Sentiment & emotion (rule-based, no ML dependency) ────────────────────────

_SENTIMENT_POSITIVE = [
    "great", "good", "happy", "excellent", "wonderful", "amazing", "productive",
    "energised", "energized", "motivated", "positive", "better", "fantastic", "well"
]
_SENTIMENT_NEGATIVE = [
    "bad", "terrible", "awful", "horrible", "stressed", "anxious", "overwhelmed",
    "exhausted", "burnt", "burned", "sad", "depressed", "tired", "struggling",
    "difficult", "hard", "tough", "worst"
]
_EMOTIONS = {
    "joy":     ["happy", "great", "excited", "joy", "pleased", "delighted"],
    "anxiety": ["anxious", "worried", "nervous", "panic", "overthinking"],
    "anger":   ["angry", "frustrated", "annoyed", "irritated", "furious"],
    "sadness": ["sad", "down", "upset", "crying", "unhappy", "depressed"],
    "fear":    ["scared", "afraid", "fearful", "terrified", "dread"],
    "burnout": ["exhausted", "burnout", "burnt out", "done", "can't cope"],
}


def _analyze_sentiment(text: str) -> Dict:
    if not text:
        return {"label": "NEUTRAL", "score": 0.5}
    t = text.lower()
    pos = sum(1 for w in _SENTIMENT_POSITIVE if w in t)
    neg = sum(1 for w in _SENTIMENT_NEGATIVE if w in t)
    if pos > neg:
        return {"label": "POSITIVE", "score": min(0.5 + pos * 0.1, 0.99)}
    if neg > pos:
        return {"label": "NEGATIVE", "score": min(0.5 + neg * 0.1, 0.99)}
    return {"label": "NEUTRAL", "score": 0.5}


def _analyze_emotion(text: str) -> Dict:
    if not text:
        return {"label": "neutral", "score": 0.5}
    t = text.lower()
    best_label, best_count = "neutral", 0
    for emotion, keywords in _EMOTIONS.items():
        count = sum(1 for k in keywords if k in t)
        if count > best_count:
            best_label, best_count = emotion, count
    return {"label": best_label, "score": min(0.5 + best_count * 0.15, 0.99)}


# ── Insights ───────────────────────────────────────────────────────────────────

def _generate_insights(inp: WellnessInput, score: int, burnout: Dict) -> List[str]:
    insights = []
    if burnout["level"] in ("HIGH", "CRITICAL"):
        insights.append(f"Burnout risk is {burnout['level'].lower()} — {burnout['description']}")
    if inp.sleep < 6:
        insights.append(f"Sleep deficit detected ({inp.sleep}h). Cognitive performance is significantly reduced.")
    if inp.stress >= 8:
        insights.append("Stress is in the critical zone. Immediate stress reduction techniques are recommended.")
    if inp.energy <= 3 and inp.productivity <= 4:
        insights.append("Both energy and productivity are very low — a physical reset is needed today.")
    if score >= 80:
        insights.append("All wellness dimensions are strong. Today is ideal for high-priority focused work.")
    if not insights:
        insights.append("Your wellness pattern is within normal range. Consistency is your best tool.")
    return insights


# ── Wellness level label ───────────────────────────────────────────────────────

def _wellness_level(score: int) -> str:
    if score >= 85: return "Excellent"
    if score >= 70: return "Good"
    if score >= 55: return "Moderate"
    if score >= 40: return "Low"
    return "Critical"


# ── Main WellnessCoach class ──────────────────────────────────────────────────

class WellnessCoach:

    def wellness_coach(self, inp: WellnessInput) -> Dict:
        score    = _calculate_score(inp)
        burnout  = _assess_burnout(inp)
        cats     = _category_scores(inp)
        senti    = _analyze_sentiment(inp.message)
        emotion  = _analyze_emotion(inp.message)
        insights = _generate_insights(inp, score, burnout)

        detailed_recs, simple_recs = self.generate_recommendations(inp)

        return {
            "wellness_score":           score,
            "wellness_level":           _wellness_level(score),
            "category_scores":          cats,
            "burnout_risk":             burnout,
            "sentiment":                senti["label"],
            "sentiment_score":          senti["score"],
            "emotion":                  emotion["label"],
            "emotion_score":            emotion["score"],
            "insights":                 insights,
            "recommendations":          simple_recs,
            "detailed_recommendations": detailed_recs,
        }

    def generate_recommendations(self, inp: WellnessInput) -> Tuple[List[Dict], List[str]]:
        """
        Returns (detailed_recs, simple_recs).
        detailed_recs: list of rich dicts for the frontend RecommendationCard.
        simple_recs: plain text list for DB storage.
        """
        detailed: List[Dict] = []
        seen_titles = set()

        for rule in ALL_RULES:
            if len(detailed) >= 5:   # cap at 5 recommendations
                break
            rec = rule(inp)
            if rec and rec["title"] not in seen_titles:
                seen_titles.add(rec["title"])
                detailed.append(rec)

        # Ensure at least 2 recommendations by adding generic fallbacks
        fallbacks = [
            _r(
                "Daily Wellness Habit: 5-Minute Morning Intention",
                "Starting each day with a short intention — even 5 minutes — improves goal follow-through by 42%.",
                "Before opening your phone or email: drink a glass of water, write one sentence about what you want to accomplish today, and take 5 deep breaths.",
                "Morning intentions improve daily productivity and reduce reactive stress throughout the day.",
                "🌅", "low", "5 min"
            ),
            _r(
                "End-of-Day Wind-Down Routine",
                "A consistent transition between work and rest signals your nervous system to downregulate cortisol, improving sleep quality and emotional recovery.",
                "At your chosen stop time: close all work apps, write 3 things completed today, step away from your desk, and do a 10-minute walk or stretching routine.",
                "A consistent wind-down routine improves sleep onset speed by 35% and next-day productivity by 20%.",
                "🌙", "low", "10 min"
            ),
        ]
        for fb in fallbacks:
            if len(detailed) >= 4:
                break
            if fb["title"] not in seen_titles:
                detailed.append(fb)

        simple = [
            f"{r['icon']} {r['title']}: {r['action'][:120]}..." if len(r['action']) > 120 else f"{r['icon']} {r['title']}: {r['action']}"
            for r in detailed
        ]
        return detailed, simple

    # ── Expose helpers for WellnessController ─────────────────────────────────

    def calculate_wellness_score(self, inp: WellnessInput) -> int:
        return _calculate_score(inp)

    def assess_burnout_risk(self, inp: WellnessInput) -> Dict:
        return _assess_burnout(inp)

    def analyze_sentiment(self, text: str) -> Dict:
        return _analyze_sentiment(text)

    def analyze_emotion(self, text: str) -> Dict:
        return _analyze_emotion(text)


# ── Module-level singleton ────────────────────────────────────────────────────

_coach: Optional[WellnessCoach] = None


def get_wellness_coach() -> WellnessCoach:
    global _coach
    if _coach is None:
        _coach = WellnessCoach()
    return _coach