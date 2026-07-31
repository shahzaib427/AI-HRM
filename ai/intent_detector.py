"""
intent_detector.py  ← FIXED VERSION
Place this at:  ai/intent_detector.py  (REPLACE your existing file)

BUG FIXED:
    Generic keywords like "how many leaves" and "my profile" were matching
    policy/how-to questions ("how many leaves do I mark in a month",
    "can I change my profile") and wrongly routing them to API_ONLY, which
    forced a login wall even though the user never asked to view their own
    personal data.

FIX:
    Added a PROCEDURAL_INDICATORS check. If the message reads like a
    how-to/policy question ("how do i", "can i", "how to", "where do i",
    "how many ... per month", etc.) and does NOT also contain a clear
    personal-data-view phrase ("check my", "show my", "what is my",
    "remaining", "left", "balance", "this month", "history"), it is
    treated as RAG_ONLY instead of API_ONLY/HYBRID, regardless of which
    API keyword matched.

WHAT IT DOES (unchanged):
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
    LEAVE_BALANCE    = "leave_balance"     # GET /api/leave/balance
    LEAVE_REQUESTS   = "leave_requests"    # GET /api/leave/my-leaves
    EMPLOYEE_PROFILE = "employee_profile"  # GET /api/employee/profile (or /api/auth/me)
    NOTIFICATIONS    = "notifications"     # GET /api/notifications
    NONE              = "none"


# ─────────────────────────────────────────────────────────────────────────────
# Keywords that trigger each API call.
# NOTE: kept close to the original list — the fix is the override layer below,
# not a rewrite of these, since these correctly match true personal-data asks.
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
        "how many leaves do i have", "remaining leaves", "casual leave left",
        "how much leave do i have", "my leave quota",
        "how many days off do i have", "leaves available"
    ],
    APIIntent.LEAVE_REQUESTS: [
        "my leaves", "leave status", "leave request status",
        "applied leaves", "leave history", "pending leave",
        "approved leave", "rejected leave", "my leave applications",
        "leave requests", "leaves i applied"
    ],
    APIIntent.EMPLOYEE_PROFILE: [
        "show my profile", "view my profile", "check my profile",
        "my details", "my information", "my department", "my designation",
        "my joining date", "employee id", "my account info",
        "my job title", "who am i", "my role", "my position"
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
    "portal access", "how many leaves per month",
    # broadened: generic procedural leave/profile phrasing
    "can i mark leave", "can i apply leave", "can i apply for leave",
    "how many leaves i", "change my profile", "update my profile",
    "update profile", "change profile", "can i change", "can i update"
]

# ─────────────────────────────────────────────────────────────────────────────
# NEW: Procedural / how-to language.
# If present, the question is about HOW something works or is DONE —
# not a request to view the user's own live data. This overrides any
# API keyword match unless a genuine data-view phrase is also present.
# ─────────────────────────────────────────────────────────────────────────────
PROCEDURAL_INDICATORS: List[str] = [
    "how do i", "how to", "how can i", "can i change", "can i update",
    "can i apply", "can i mark", "can i request", "where do i",
    "where can i", "steps to", "process to", "how many .* per month",
    "how many .* in a month", "how many .* i mark", "how many .* i apply",
    "what is the process", "procedure for", "rules for"
]

# ─────────────────────────────────────────────────────────────────────────────
# NEW: Genuine personal-data-view language.
# If ANY of these appear, we trust the API match even if a procedural
# phrase is also present (e.g. "how do I check my leave balance" should
# still go to API, since the user does want their live number).
# ─────────────────────────────────────────────────────────────────────────────
DATA_VIEW_INDICATORS: List[str] = [
    "check my", "show my", "view my", "what is my", "what's my",
    "remaining", "left", "balance", "this month", "last month",
    "history", "current", "my current"
]


def _matches_any(patterns: List[str], text: str) -> bool:
    """Supports both plain substrings and simple regex patterns (with .*)."""
    for p in patterns:
        if ".*" in p:
            if re.search(p, text):
                return True
        elif p in text:
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Main detect function
# ─────────────────────────────────────────────────────────────────────────────
def detect_intent(user_message: str) -> Tuple[IntentType, List[APIIntent]]:
    """
    Analyzes user message → returns (IntentType, list of APIIntents to call).
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

    # ── NEW: Procedural override ───────────────────────────────────────────────
    # If the question is asking HOW something is done / whether an action is
    # allowed, and there's no clear "show me MY live data" phrasing, treat it
    # as a policy/how-to question — never gate it behind login.
    is_procedural = _matches_any(PROCEDURAL_INDICATORS, message_lower)
    is_data_view = any(kw in message_lower for kw in DATA_VIEW_INDICATORS)

    if is_procedural and not is_data_view:
        detected_apis = []
        needs_rag = True

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
        "how many leaves i mark in a month",
        "can i change my profile",
    ]
    for q in tests:
        intent, apis = detect_intent(q)
        print(f"Q: {q}")
        print(f"   Intent={intent.value}  |  APIs={[a.value for a in apis]}\n")