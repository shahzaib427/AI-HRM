"""
intent_detector.py  ← NEW FILE
Place this at:  ai/intent_detector.py

WHAT IT DOES:
    Reads the user's question and decides:
    - RAG_ONLY  → answer from your hr_docs text files (existing behavior)
    - API_ONLY  → call your MERN backend APIs to get live employee data
    - HYBRID    → do both, combine into one answer
    - UNKNOWN   → fall back to RAG (safe default)

NO LLM needed here. Pure keyword matching → fast, cheap, reliable.
"""

import re
from enum import Enum
from typing import Tuple, List


# ─────────────────────────────────────────────────────────────────────────────
# Intent Types
# ─────────────────────────────────────────────────────────────────────────────
class IntentType(str, Enum):
    RAG_ONLY = "rag_only"   # answer from documents
    API_ONLY = "api_only"   # fetch from MERN backend
    HYBRID   = "hybrid"     # both documents + MERN backend
    UNKNOWN  = "unknown"    # can't determine → fall back to RAG


# ─────────────────────────────────────────────────────────────────────────────
# API Sub-Intents
# Each maps to a specific MERN route you already have
# ─────────────────────────────────────────────────────────────────────────────
class APIIntent(str, Enum):
    ATTENDANCE       = "attendance"        # GET /api/attendance/my-attendance
    PAYROLL          = "payroll"           # GET /api/employee/payroll
    PAYROLL_STATS    = "payroll_stats"     # GET /api/employee/payroll/dashboard
    LEAVE_BALANCE    = "leave_balance"     # GET /api/leave/balance  (add this to MERN if missing)
    LEAVE_REQUESTS   = "leave_requests"   # GET /api/leave/my-leaves
    EMPLOYEE_PROFILE = "employee_profile"  # GET /api/employee/profile (or /api/auth/me)
    NOTIFICATIONS    = "notifications"    # GET /api/notifications
    NONE             = "none"


# ─────────────────────────────────────────────────────────────────────────────
# Keywords that trigger each API call
# These match natural language your employees actually use
# ─────────────────────────────────────────────────────────────────────────────
API_KEYWORD_MAP: dict = {
    APIIntent.ATTENDANCE: [
        "my attendance", "attendance this month", "attendance report",
        "how many days present", "how many days absent", "check in history",
        "checkout history", "attendance record", "attendance history",
        "days i was present", "days present", "present this month",
        "absent this month", "late this month", "my check-ins"
    ],
    APIIntent.PAYROLL: [
        "my salary", "my payslip", "pay slip", "my payroll",
        "salary this month", "last month salary", "how much salary",
        "salary credited", "net pay", "my pay", "salary history",
        "salary slips", "payslip download", "my earnings",
        "salary received", "when was salary paid"
    ],
    APIIntent.PAYROLL_STATS: [
        "salary summary", "total salary", "salary stats",
        "payroll dashboard", "salary overview", "total earned"
    ],
    APIIntent.LEAVE_BALANCE: [
        "leave balance", "leaves left", "leaves remaining",
        "how many leaves", "remaining leaves", "casual leave left",
        "how much leave do i have", "my leave quota",
        "how many days off", "leaves available"
    ],
    APIIntent.LEAVE_REQUESTS: [
        "my leaves", "leave status", "leave request status",
        "applied leaves", "leave history", "pending leave",
        "approved leave", "rejected leave", "my leave applications",
        "leave requests", "leaves i applied"
    ],
    APIIntent.EMPLOYEE_PROFILE: [
        "my profile", "my details", "my information",
        "my department", "my designation", "my joining date",
        "employee id", "my account info", "my job title",
        "who am i", "my role", "my position"
    ],
    APIIntent.NOTIFICATIONS: [
        "notifications", "my notifications", "any alerts",
        "any updates", "announcements", "new messages",
        "unread notifications", "what's new"
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# Keywords that point to HR policy DOCUMENTS (your existing RAG)
# ─────────────────────────────────────────────────────────────────────────────
RAG_KEYWORDS: List[str] = [
    "policy", "procedure", "rule", "guideline", "regulation",
    "how to apply", "how do i apply", "how to mark", "where to mark",
    "what is the policy", "leave policy", "attendance policy",
    "when is salary processed", "salary policy", "payroll policy",
    "probation", "notice period", "dress code", "code of conduct",
    "remote work", "work from home policy", "overtime", "bonus policy",
    "contact hr", "email hr", "hr portal", "lsit portal",
    "forgot attendance", "missed check in", "attendance issue",
    "portal access", "how many leaves per month"
]


# ─────────────────────────────────────────────────────────────────────────────
# Main detect function
# ─────────────────────────────────────────────────────────────────────────────
def detect_intent(user_message: str) -> Tuple[IntentType, List[APIIntent]]:
    """
    Analyzes user message → returns (IntentType, list of APIIntents to call).

    Examples:
        "how many leaves do I have left?"
        → (API_ONLY, [APIIntent.LEAVE_BALANCE])

        "show my attendance this month"
        → (API_ONLY, [APIIntent.ATTENDANCE])

        "when is salary processed?"
        → (RAG_ONLY, [])

        "how many leaves left and what is the leave policy?"
        → (HYBRID, [APIIntent.LEAVE_BALANCE])

        "hi"
        → (UNKNOWN, [])   ← will fall back to your existing RAG/greeting logic
    """
    message_lower = user_message.lower().strip()

    # ── Detect which APIs are needed ──────────────────────────────────────────
    detected_apis: List[APIIntent] = []
    for api_intent, keywords in API_KEYWORD_MAP.items():
        for kw in keywords:
            if kw in message_lower:
                if api_intent not in detected_apis:
                    detected_apis.append(api_intent)
                break  # one match per category is enough

    # ── Detect if policy documents are also needed ────────────────────────────
    needs_rag = any(kw in message_lower for kw in RAG_KEYWORDS)

    # ── Decision ──────────────────────────────────────────────────────────────
    if detected_apis and needs_rag:
        return IntentType.HYBRID, detected_apis

    if detected_apis and not needs_rag:
        return IntentType.API_ONLY, detected_apis

    if needs_rag and not detected_apis:
        return IntentType.RAG_ONLY, []

    # Can't determine → UNKNOWN → existing code handles it (greeting, RAG, etc.)
    return IntentType.UNKNOWN, []


# ─────────────────────────────────────────────────────────────────────────────
# Quick test — run: python intent_detector.py
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        "How many leaves do I have left?",
        "Show my attendance for this month",
        "When is salary processed?",
        "How many leaves do I have and what is the leave policy?",
        "What is my net pay this month?",
        "Show my profile",
        "Hi",
        "How to apply for leave?",
    ]
    for q in tests:
        intent, apis = detect_intent(q)
        print(f"Q: {q}")
        print(f"   Intent={intent.value}  |  APIs={[a.value for a in apis]}\n")