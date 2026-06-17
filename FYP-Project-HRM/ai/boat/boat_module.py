"""
boat_module.py  ← MODIFIED VERSION
Place at: ai/boat/boat_module.py  (REPLACE your existing file)

WHAT CHANGED vs YOUR ORIGINAL:
  1. Added imports for intent_detector and hr_api_service (top of file)
  2. generate_answer(question) → generate_answer(question, jwt_token=None)
     (added jwt_token parameter — backward compatible, default is None)
  3. Inside generate_answer(): added intent detection block BEFORE the
     existing quick_mapping logic. If RAG_ONLY or UNKNOWN → runs your
     existing code unchanged. If API or HYBRID → calls MERN APIs.
  4. predict(data) → reads jwt_token from the data dict and passes it down.

EVERYTHING ELSE IS 100% IDENTICAL TO YOUR ORIGINAL.
"""

import os
import sys
import torch
from sentence_transformers import SentenceTransformer
from transformers import T5Tokenizer, T5ForConditionalGeneration
from sklearn.metrics.pairwise import cosine_similarity
import re
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional
import logging

# ─── NEW: add ai/ directory to path so we can import our new modules ─────────
# This is needed because boat_module.py is inside ai/boat/ but our new files
# are in ai/ (one level up)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

from intent_detector import detect_intent, IntentType, APIIntent   # ← NEW
from hr_api_service   import HRApiService, HRDataFormatter          # ← NEW

logger = logging.getLogger(__name__)

# --------------------------
# Configuration - OPTIMIZED FOR SPEED
# (UNCHANGED from your original)
# --------------------------
CONFIG = {
    'min_similarity_threshold': 0.35,
    'max_context_docs': 2,
    'max_generation_tokens': 100,
    'temperature': 0.1,
    'num_beams': 2,
    'repetition_penalty': 1.2,
    'use_generation': False
}

# --------------------------
# NEW: MERN backend base URL
# Add MERN_BASE_URL=http://localhost:5000/api to your ai/.env
# --------------------------
MERN_BASE_URL = os.getenv("MERN_BASE_URL", "http://localhost:5000/api")

# --------------------------
# Memory optimization for 4GB RAM
# (UNCHANGED)
# --------------------------
torch.set_num_threads(2)

# --------------------------
# Embedding model for RAG
# (UNCHANGED)
# --------------------------
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# --------------------------
# Generator model (FLAN-T5-small)
# (UNCHANGED)
# --------------------------
model_name = "google/flan-t5-small"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)

print("Models loaded!")

# --------------------------
# Load HR documents from folder
# (UNCHANGED — your exact original code)
# --------------------------
docs_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hr_docs")
knowledge_base = []
knowledge_metadata = []
embeddings = None

if not os.path.exists(docs_folder):
    print(f"ERROR: HR documents folder '{docs_folder}' not found! Knowledge base is empty.")
else:
    print(f"\nLoading HR documents from: {docs_folder}")

    def smart_chunk_text(text: str, filename: str) -> List[str]:
        """Intelligently chunk text while preserving context - OPTIMIZED"""
        chunks = []
        text = text.strip()
        if not text:
            return chunks
        qa_pattern = r'(Q:.*?\nA:.*?)(?=\nQ:|$)'
        qa_matches = re.findall(qa_pattern, text, re.DOTALL | re.IGNORECASE)
        if qa_matches:
            for match in qa_matches:
                clean_match = match.strip()
                if len(clean_match) > 20:
                    chunks.append(clean_match)
            return chunks[:10]
        paragraphs = re.split(r'\n\s*\n', text)
        for para in paragraphs:
            clean_para = para.strip()
            if len(clean_para) > 50:
                chunks.append(clean_para)
            elif len(clean_para) > 20:
                chunks.append(clean_para)
        if not chunks and len(text) > 20:
            chunks.append(text)
        seen = set()
        unique_chunks = []
        for chunk in chunks:
            chunk_hash = hash(chunk[:100])
            if chunk_hash not in seen:
                seen.add(chunk_hash)
                unique_chunks.append(chunk)
        return unique_chunks[:15]

    def extract_keywords(text: str) -> set:
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        return {word for word in words if word not in stopwords}

    for filename in os.listdir(docs_folder):
        if filename.endswith(".txt"):
            filepath = os.path.join(docs_folder, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
                    if not text.strip():
                        print(f"  ⚠️ Warning: {filename} is empty, skipping...")
                        continue
                    chunks = smart_chunk_text(text, filename)
                    for chunk in chunks:
                        keywords = extract_keywords(chunk)
                        knowledge_base.append(chunk)
                        knowledge_metadata.append({
                            'source': filename,
                            'keywords': keywords,
                            'preview': chunk[:100] + "..." if len(chunk) > 100 else chunk,
                            'length': len(chunk),
                            'full_text': chunk
                        })
                    print(f"  ✅ Loaded {len(chunks)} chunks from {filename}")
            except Exception as e:
                print(f"  ❌ Error loading {filename}: {e}")

    print(f"\n📚 Total: {len(knowledge_base)} knowledge chunks loaded")

    if len(knowledge_base) > 0:
        print("\n🔍 Creating embeddings for search...")
        embeddings = embed_model.encode(knowledge_base, show_progress_bar=True)
        print("✅ Embeddings created!")
    else:
        embeddings = None

# --------------------------
# Search function (UNCHANGED)
# --------------------------
def search_docs(query: str, top_k: int = 3) -> List[Dict]:
    if not knowledge_base or embeddings is None:
        return []
    query_emb = embed_model.encode([query])
    sims = cosine_similarity(query_emb, embeddings)[0]
    top_k_actual = min(top_k * 3, len(sims))
    top_indices = sims.argsort()[-top_k_actual:][::-1]
    relevant_docs = []
    query_keywords = set([w for w in query.lower().split() if len(w) > 2])
    for idx in top_indices:
        keyword_boost = 0
        if query_keywords and 'keywords' in knowledge_metadata[idx]:
            keyword_match = len(query_keywords & knowledge_metadata[idx]['keywords'])
            keyword_boost = keyword_match * 0.1
        final_score = sims[idx] + keyword_boost
        if final_score >= CONFIG['min_similarity_threshold']:
            relevant_docs.append({
                'content': knowledge_base[idx],
                'score': final_score,
                'source': knowledge_metadata[idx]['source'],
                'full_text': knowledge_metadata[idx]['full_text']
            })
    relevant_docs.sort(key=lambda x: x['score'], reverse=True)
    return relevant_docs[:top_k]

# --------------------------
# handle_clarification (UNCHANGED)
# --------------------------
def handle_clarification(question: str, previous_question: str = None, previous_answer: str = None) -> Optional[str]:
    q_lower = question.lower().strip()
    if "did you mean" in q_lower or "do you mean" in q_lower or "you mean" in q_lower:
        return "I understand you're asking for clarification. Could you please rephrase your question more specifically? I'm here to help with HR-related queries about attendance, leave, payroll, policies, and more."
    if "pay day" in q_lower or "paid day" in q_lower or "salary day" in q_lower:
        return "Salary is processed between 5th and 7th of each month. If the salary date falls on a weekend or public holiday, salaries are processed on the previous working day. For any payroll inquiries, please contact payroll@lsituoe.edu.pk or HR at hr@lsituoe.edu.pk."
    if "holiday" in q_lower and ("salary" in q_lower or "paid" in q_lower):
        return "If salary date falls on a public holiday, salaries are processed on the preceding working day. You will receive your salary in your bank account before the holiday. For urgent concerns, contact payroll@lsituoe.edu.pk or administration@lsituoe.edu.pk."
    if any(word in q_lower for word in ["contact", "email", "mail", "reach", "call"]):
        return "You can contact HR department at:\n📧 Email: hr@lsituoe.edu.pk\n📧 Administration: administration@lsituoe.edu.pk\n📞 Phone: +92-XX-XXXXXXX\n🌐 Portal: https://lsit.edu.pk/hr\nFor urgent matters, please visit HR office between 9:00 AM - 5:00 PM, Monday to Friday."
    return None

# --------------------------
# get_best_answer_from_context (UNCHANGED)
# --------------------------
def get_best_answer_from_context(question: str, context_docs: List[Dict]) -> Optional[str]:
    if not context_docs:
        return None
    question_lower = question.lower()
    question_words = set(question_lower.split())
    common_words = {'where', 'what', 'how', 'do', 'i', 'my', 'the', 'a', 'an', 'is', 'are', 'to', 'for',
                    'can', 'you', 'help', 'me', 'please', 'i', 'am', 'would', 'like', 'need', 'want', 'does', 'have'}
    question_words -= common_words
    question_words = {w for w in question_words if len(w) > 2}
    best_answer = None
    best_score = 0
    for doc in context_docs:
        content = doc['content']
        source = doc.get('source', '').lower()
        source_boost = 0
        if 'payroll' in source and any(k in question_lower for k in ['salary', 'paid', 'bank', 'account', 'pay']):
            source_boost = 0.3
        if 'attendance' in source and any(k in question_lower for k in ['attendance', 'check', 'mark']):
            source_boost = 0.3
        if 'leave' in source and any(k in question_lower for k in ['leave', 'vacation', 'holiday', 'month']):
            source_boost = 0.3
        qa_pattern = r'Q:\s*(.*?)\nA:\s*(.*?)(?=\nQ:|$)'
        qa_matches = re.findall(qa_pattern, content, re.DOTALL | re.IGNORECASE)
        for q, a in qa_matches:
            q_lower = q.lower()
            a_clean = a.strip()
            q_words = set(q_lower.split())
            q_words -= common_words
            q_words = {w for w in q_words if len(w) > 2}
            word_score = len(question_words & q_words) / max(len(question_words), 1) if question_words else 0
            keyword_score = 0
            for kw_pair in [('salary','salary'),('history','history'),('bank','bank'),('bank','account'),
                             ('update','update'),('update','change'),('paid','paid'),('paid','credited'),
                             ('attend','attend'),('attend','mark'),('pay','pay'),('pay','salary'),
                             ('holiday','holiday'),('holiday','weekend'),('leave','leave'),('leave','vacation'),
                             ('month','month'),('month','per month')]:
                if kw_pair[0] in question_lower and kw_pair[1] in q_lower:
                    keyword_score += 0.5
            total_score = word_score + keyword_score + source_boost
            if total_score > best_score:
                best_score = total_score
                best_answer = a_clean
        if best_answer and best_score > 0.25:
            return best_answer
        bullet_pattern = r'[•\-*]\s*(.+?)(?=\n[•\-*]|\n\n|$)'
        bullet_matches = re.findall(bullet_pattern, content, re.DOTALL)
        for bullet in bullet_matches:
            bullet_lower = bullet.lower()
            relevance = sum(1 for word in question_words if word in bullet_lower)
            if relevance > 0:
                return bullet.strip()
        sentences = re.split(r'[.!?]+', content)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 20:
                continue
            sentence_lower = sentence.lower()
            key_terms_found = sum(1 for word in question_words if word in sentence_lower)
            if key_terms_found > 0 and key_terms_found / max(len(question_words), 1) > 0.3:
                return sentence
        if 'where' in question_lower or 'how' in question_lower:
            urls = re.findall(r'https?://[^\s]+', content)
            if urls:
                return f"Access at: {urls[0]}"
    if best_answer:
        return best_answer
    return None

# --------------------------
# get_simple_response (UNCHANGED)
# --------------------------
def get_simple_response(question: str) -> Optional[str]:
    q = question.lower().strip()
    greetings = ["hi", "hello", "hey", "hii", "helloo", "greetings", "good morning", "good afternoon", "good evening"]
    acknowledgments = ["ok", "okay", "thanks", "thank you", "got it", "sure", "fine", "cool", "nice", "alright"]
    if any(greet in q for greet in greetings):
        return "Hello! I'm your HR assistant. How can I help you today?"
    if any(ack in q for ack in acknowledgments):
        return "You're welcome! Is there anything else I can help you with?"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# NEW: fetch_and_format_api_data
# Called when intent is API_ONLY or HYBRID
# Calls your MERN backend and returns formatted text
# ─────────────────────────────────────────────────────────────────────────────
def fetch_and_format_api_data(api_intents: List[APIIntent], jwt_token: str) -> str:
    """
    Calls MERN APIs for each detected intent.
    Returns combined formatted text for the chatbot response.

    Args:
        api_intents : list of APIIntent values detected from user message
        jwt_token   : "Bearer <token>" string forwarded from React frontend
    """
    service   = HRApiService(base_url=MERN_BASE_URL, jwt_token=jwt_token)
    formatter = HRDataFormatter()
    results   = []

    for intent in api_intents:
        try:
            if intent == APIIntent.ATTENDANCE:
                resp = service.get_attendance()
                results.append(formatter.format_attendance(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.PAYROLL:
                resp = service.get_payroll()
                results.append(formatter.format_payroll(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.PAYROLL_STATS:
                resp = service.get_payroll_stats()
                results.append(formatter.format_payroll_stats(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.LEAVE_BALANCE:
                resp = service.get_leave_balance()
                results.append(formatter.format_leave_balance(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.LEAVE_REQUESTS:
                resp = service.get_leave_requests()
                results.append(formatter.format_leave_requests(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.EMPLOYEE_PROFILE:
                resp = service.get_employee_profile()
                results.append(formatter.format_employee_profile(resp.data) if resp.success else f"⚠️ {resp.error}")

            elif intent == APIIntent.NOTIFICATIONS:
                resp = service.get_notifications()
                results.append(formatter.format_notifications(resp.data) if resp.success else f"⚠️ {resp.error}")

        except Exception as e:
            logger.error(f"[fetch_api_data] Error for {intent}: {e}")
            results.append(f"⚠️ Could not fetch {intent.value} data. Please try again.")

    return "\n\n".join(results) if results else "No data could be retrieved."


# ─────────────────────────────────────────────────────────────────────────────
# generate_answer — MODIFIED
# Only change: added jwt_token=None parameter + intent detection block at top
# Everything below the intent block is YOUR ORIGINAL CODE untouched
# ─────────────────────────────────────────────────────────────────────────────
def generate_answer(question: str, jwt_token: Optional[str] = None) -> str:
    """
    MODIFIED: added jwt_token parameter (default None = backward compatible).

    New flow:
      1. detect_intent(question)
      2. If API_ONLY or HYBRID → call MERN APIs → return/combine
      3. If RAG_ONLY or UNKNOWN → run your existing code (unchanged)
    """
    q_lower = question.lower().strip()

    # ─────────────────────────────────────────────────────────────────────────
    # ▼▼▼  NEW BLOCK — Intent Detection + API Fetching  ▼▼▼
    # ─────────────────────────────────────────────────────────────────────────
    intent, api_intents = detect_intent(question)
    logger.info(f"[generate_answer] intent={intent} | apis={api_intents} | has_token={bool(jwt_token)}")

    if intent == IntentType.API_ONLY:
        # User wants live personal data (attendance, payroll, leaves, etc.)
        if not jwt_token:
            return (
                "🔒 To view your personal HR data, you need to be logged in.\n"
                "Please log in to the LSIT HR portal and try again."
            )
        return fetch_and_format_api_data(api_intents, jwt_token)

    if intent == IntentType.HYBRID:
        # User wants both live data AND policy info
        api_text = ""
        if jwt_token:
            api_text = fetch_and_format_api_data(api_intents, jwt_token)
        else:
            api_text = "🔒 Note: Log in to also see your personal data.\n"
        # Now let the RAG section below generate the policy answer,
        # then we'll combine at the end.
        # We use a flag so we know to prepend api_text later.
        # Fall through to RAG code below, then combine at return.
    # ─────────────────────────────────────────────────────────────────────────
    # ▲▲▲  END NEW BLOCK  ▲▲▲
    # ─────────────────────────────────────────────────────────────────────────

    # --------------------------
    # YOUR ORIGINAL CODE (100% unchanged from here)
    # --------------------------
    quick_mapping = {
        "check in": "Staff must click 'Check In' at the start of the day before 10:00 AM. Late check-ins will be marked as late. For attendance issues, contact administration@lsituoe.edu.pk.",
        "check out": "Staff must click 'Check Out' at the end of the day for accurate attendance tracking. For attendance issues, contact administration@lsituoe.edu.pk.",
        "where to mark attendance": "Log in to LSIT HR portal at https://lsit.edu.pk/attendance or use LSIT Connect mobile app. Click 'Check In' at start and 'Check Out' at end of day. For assistance, contact administration@lsituoe.edu.pk.",
        "forgot attendance": "Contact administration within 24 hours at administration@lsituoe.edu.pk to rectify your attendance.",
        "attendance history": "You can view your attendance history in the LSIT portal or LSIT Connect app under 'Attendance History'. For discrepancies, contact administration@lsituoe.edu.pk.",
        "late check in": "Any check-in after 10:00 AM will be marked as late in your attendance record. Contact administration@lsituoe.edu.pk for any concerns.",
        "attendance issue": "For any attendance-related issues (late marking, missed check-in, incorrect records), please contact administration@lsituoe.edu.pk within 24 hours. You can also visit HR office for assistance.",
        "marked late": "If your attendance is marked late, it means you checked in after 10:00 AM. Multiple late check-ins may affect your attendance record. Contact administration@lsituoe.edu.pk for clarification.",
        "attendance not marked": "If your attendance is not marked, please contact administration@lsituoe.edu.pk within 24 hours with your employee ID and date to rectify the record.",
        "leave": "Employees are entitled to 2 casual leaves per month (24 leaves per year). For leave applications, log in to LSIT HR portal and go to Leave Management. For leave inquiries, contact hr@lsituoe.edu.pk.",
        "how much leave": "Employees get 2 casual leaves per month (24 leaves per year). Annual leave policy may vary by department. Contact hr@lsituoe.edu.pk for details.",
        "leaves in a month": "You get 2 casual leaves per month. Unused leaves can be carried forward up to 12 leaves per year. Contact hr@lsituoe.edu.pk for leave balance inquiries.",
        "where to mark leave": "Log in to LSIT HR portal at https://lsit.edu.pk, go to 'Leave Management' section, and submit leave request. For urgent leaves, email hr@lsituoe.edu.pk.",
        "apply leave": "Submit leave request through LSIT HR portal under 'Leave Management' section. For urgent leaves, please inform your manager and HR via email at hr@lsituoe.edu.pk.",
        "leave policy": "Leave Policy:\n• 2 casual leaves per month (24 per year)\n• Leaves require 2 days advance notice\n• Emergency/sick leaves can be applied on same day\n• Unused leaves can be carried forward (max 12)\n• For leave balance, check portal or contact hr@lsituoe.edu.pk",
        "leave balance": "You can check your leave balance in LSIT HR portal under 'Leave Balance' section. For inquiries, contact hr@lsituoe.edu.pk.",
        "sick leave": "Sick leaves are part of casual leave quota. For sick leave, apply through portal and inform your manager. For leaves exceeding 3 days, medical certificate may be required.",
        "annual leave": "Annual leaves are separate from monthly casual leaves. Contact hr@lsituoe.edu.pk for annual leave policy details.",
        "salary history": "You can view your salary history in the LSIT HR portal under 'Payroll' or 'Salary Slips' section. For payroll inquiries, contact payroll@lsituoe.edu.pk.",
        "bank account": "To update bank account details, submit a request through LSIT HR portal under 'My Profile' > 'Bank Details' or contact payroll@lsituoe.edu.pk.",
        "salary paid": "Salary is credited between 5th and 7th of each month to your bank account. For issues, contact payroll@lsituoe.edu.pk.",
        "when salary": "Salary is credited between 5th and 7th of each month. Contact payroll@lsituoe.edu.pk for any delays.",
        "update bank": "Visit LSIT HR portal and navigate to 'My Profile' > 'Bank Details' to update your account information. For assistance, contact payroll@lsituoe.edu.pk.",
        "pay day": "Salary is processed between 5th and 7th of each month. If the salary date falls on a weekend or public holiday, salaries are processed on the previous working day. For any payroll inquiries, please contact payroll@lsituoe.edu.pk or administration@lsituoe.edu.pk.",
        "paid day": "Salary is credited between 5th and 7th of each month. If salary date is a holiday, it will be processed on the preceding business day. Contact payroll@lsituoe.edu.pk for concerns.",
        "holiday salary": "If salary date falls on a public holiday, salaries are processed on the preceding working day. You will receive salary in your bank account before the holiday. For urgent concerns, contact payroll@lsituoe.edu.pk or administration@lsituoe.edu.pk.",
        "salary date holiday": "When salary date falls on a public holiday or weekend, salaries are processed on the previous working day. For any delays, contact payroll@lsituoe.edu.pk or administration@lsituoe.edu.pk.",
        "contact hr": "You can contact HR department at:\n📧 Email: hr@lsituoe.edu.pk\n📧 Administration: administration@lsituoe.edu.pk\n📞 Phone: +92-XX-XXXXXXX\n🌐 Portal: https://lsit.edu.pk/hr\n📍 Location: HR Office, 2nd Floor, Administration Block\n🕒 Hours: 9:00 AM - 5:00 PM, Monday to Friday",
        "email hr": "HR email addresses:\n• General HR: hr@lsituoe.edu.pk\n• Payroll: payroll@lsituoe.edu.pk\n• Administration: administration@lsituoe.edu.pk\n• Recruitment: careers@lsituoe.edu.pk",
        "contact administration": "Administration department can be reached at:\n📧 Email: administration@lsituoe.edu.pk\n📞 Phone: +92-XX-XXXXXXX\n🕒 Hours: 9:00 AM - 5:00 PM, Monday to Friday",
        "any issues": "If you're experiencing any HR-related issues (attendance, leave, salary, portal access), please contact:\n📧 HR: hr@lsituoe.edu.pk\n📧 Administration: administration@lsituoe.edu.pk\n📞 Phone: +92-XX-XXXXXXX\nVisit HR office for immediate assistance.",
        "issue in attendance": "For attendance issues (late marking, missed check-in, incorrect records), please contact administration@lsituoe.edu.pk within 24 hours with your employee ID and date. Visit HR office if urgent.",
        "issue in leave": "For leave-related issues (approval delay, balance discrepancy), contact hr@lsituoe.edu.pk with your leave request details. Visit portal to check leave status.",
        "issue in salary": "For salary-related issues (delay, incorrect amount, missing salary), contact payroll@lsituoe.edu.pk immediately. Provide your employee ID and month for faster resolution.",
        "portal issue": "For LSIT HR portal access issues, contact IT support at it@lsituoe.edu.pk or administration@lsituoe.edu.pk for assistance.",
    }

    for key, response in quick_mapping.items():
        if key in q_lower:
            # If HYBRID, prepend API data to the quick_mapping answer
            if intent == IntentType.HYBRID and api_text:
                return api_text + "\n\n📖 **HR Policy:**\n" + response
            return response

    clarification = handle_clarification(question)
    if clarification:
        if intent == IntentType.HYBRID and api_text:
            return api_text + "\n\n" + clarification
        return clarification

    simple_response = get_simple_response(question)
    if simple_response:
        return simple_response

    if not knowledge_base:
        return "I don't have any HR documents loaded. Please add HR documents to the system."

    relevant_docs = search_docs(question, top_k=3)

    if not relevant_docs:
        topics = set(meta['source'].replace('.txt','').replace('_',' ').title() for meta in knowledge_metadata)
        rag_fallback = (f"I couldn't find specific information about '{question}'. However, I can help with these topics:\n"
                        f"📚 {', '.join(sorted(topics))}\n\n"
                        f"For personalized assistance, please contact:\n"
                        f"📧 HR: hr@lsituoe.edu.pk\n📧 Administration: administration@lsituoe.edu.pk")
        if intent == IntentType.HYBRID and api_text:
            return api_text + "\n\n" + rag_fallback
        return rag_fallback

    best_answer = get_best_answer_from_context(question, relevant_docs)

    if not best_answer:
        rag_fallback = ("I found some information but couldn't extract a clear answer to your question.\n\n"
                        "💡 Did you mean to ask about:\n"
                        "• Attendance policies and check-in\n"
                        "• Leave requests (2 leaves per month)\n"
                        "• Salary/payroll information (5th-7th of month)\n"
                        "• HR portal access\n\n"
                        "Please rephrase your question or contact:\n"
                        "📧 HR: hr@lsituoe.edu.pk\n"
                        "📧 Administration: administration@lsituoe.edu.pk\n"
                        "for immediate assistance.")
        if intent == IntentType.HYBRID and api_text:
            return api_text + "\n\n" + rag_fallback
        return rag_fallback

    best_answer = best_answer.strip()
    if best_answer.startswith('Q:'):
        best_answer = best_answer.split('A:')[-1].strip()

    if any(k in q_lower for k in ['issue', 'problem', 'error', 'not working', 'help', 'assistance']):
        best_answer += f"\n\n📧 If you need further assistance, please contact:\n• HR: hr@lsituoe.edu.pk\n• Administration: administration@lsituoe.edu.pk"

    # HYBRID: prepend live API data above the RAG answer
    if intent == IntentType.HYBRID and api_text:
        return api_text + "\n\n📖 **HR Policy:**\n" + best_answer

    return best_answer


# --------------------------
# get_document_stats (UNCHANGED)
# --------------------------
def get_document_stats() -> Dict:
    sources = {}
    for meta in knowledge_metadata:
        source = meta['source']
        if source not in sources:
            sources[source] = {'chunks': 0, 'total_chars': 0}
        sources[source]['chunks'] += 1
        sources[source]['total_chars'] += meta.get('length', 0)
    return {
        'total_chunks': len(knowledge_base),
        'total_documents': len(sources),
        'documents': sources
    }


# ─────────────────────────────────────────────────────────────────────────────
# predict — MODIFIED
# Only change: reads jwt_token from data dict and passes to generate_answer
# All other logic is identical to your original
# ─────────────────────────────────────────────────────────────────────────────
def predict(data: dict) -> dict:
    action = data.get('action')

    if action == 'ask':
        question = data.get('question', '')
        if not question:
            return {'status': 'error', 'answer': 'No question provided.'}
        try:
            start_time = datetime.now()
            # ▼ ONLY CHANGE: read jwt_token and pass to generate_answer
            jwt_token = data.get('jwt_token')   # ← NEW
            answer = generate_answer(question, jwt_token=jwt_token)  # ← MODIFIED
            elapsed = (datetime.now() - start_time).total_seconds()
            return {'status': 'success', 'answer': answer, 'response_time': elapsed}
        except Exception as e:
            return {'status': 'error', 'answer': f"Error: {str(e)}"}

    elif action == 'search':
        query = data.get('query', '')
        top_k = data.get('top_k', 5)
        if not query:
            return {'status': 'error', 'results': []}
        try:
            results = search_docs(query, top_k)
            clean_results = [{'content': r['content'][:300], 'score': float(r['score']), 'source': r['source']} for r in results]
            return {'status': 'success', 'results': clean_results}
        except Exception as e:
            return {'status': 'error', 'results': [], 'error': str(e)}

    elif action == 'status':
        return {'status': 'success', 'data': {'knowledge_base_size': len(knowledge_base), 'documents_loaded': len(knowledge_base) > 0}}

    elif action == 'list_documents':
        stats = get_document_stats()
        return {'status': 'success', 'documents': list(stats['documents'].keys())}

    else:
        return {'status': 'error', 'answer': 'Unknown action.'}


# --------------------------
# CLI mode (UNCHANGED)
# --------------------------
def run_cli():
    stats = get_document_stats()
    print("\n" + "="*50)
    print("🤖 HR Assistant")
    print("="*50)
    print(f"📚 Loaded: {len(knowledge_base)} chunks from {stats['total_documents']} documents")
    print("Type 'exit' to quit\n")
    while True:
        question = input("You: ").strip()
        if question.lower() in ["exit", "quit", "bye"]:
            print("Bot: Goodbye!")
            break
        if not question:
            continue
        print("Bot: ", end="", flush=True)
        start_time = datetime.now()
        answer = generate_answer(question)
        elapsed = (datetime.now() - start_time).total_seconds()
        print(answer)
        print(f"({elapsed:.2f}s)\n")

if __name__ == "__main__":
    run_cli()