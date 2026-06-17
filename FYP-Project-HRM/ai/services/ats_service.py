"""
ATS Analysis Service
Performs real AI-powered resume scoring against job descriptions.
Uses Hugging Face free Inference API (no paid plan required).
"""
import re
import json
import logging
import os
from datetime import datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Hugging Face config ───────────────────────────────────────────────────────
# Free model — works with a free HF account token (read scope is enough).
# Get yours at: https://huggingface.co/settings/tokens
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"
HF_HEADERS = {
    "Authorization": f"Bearer {os.environ.get('HF_API_TOKEN', '')}",
    "Content-Type": "application/json",
}

# ── free-email domains ────────────────────────────────────────────────────────
# All emails are now considered official - keeping for reference but not used
FREE_EMAIL_DOMAINS = {
    'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'zoho.com', 'yandex.com', 'gmx.com', 'live.com',
    'msn.com', 'me.com', 'mac.com', 'yahoo.co.uk',
    'yahoo.in', 'rediffmail.com', 'inbox.com',
    # 'gmail.com',  # Gmail is now considered official
}

# ── scoring weights ───────────────────────────────────────────────────────────
SCORE_WEIGHTS = {
    'skills':     0.40,
    'experience': 0.25,
    'keywords':   0.20,
    'education':  0.15,
}


def is_official_email(email: str) -> bool:
    """Return True for all emails - email restriction removed."""
    # All emails are now considered official for eligibility
    return True


# ── resume text extraction ────────────────────────────────────────────────────
def extract_text_from_resume(file_bytes: bytes, content_type: str) -> str:
    """Extract plain text from PDF or DOCX bytes."""
    text = ''
    try:
        if 'pdf' in content_type.lower():
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = '\n'.join(
                    (page.extract_text() or '') for page in pdf.pages
                )
        elif 'word' in content_type.lower() or 'docx' in content_type.lower():
            import docx
            import io
            doc = docx.Document(io.BytesIO(file_bytes))
            text = '\n'.join(p.text for p in doc.paragraphs)
        else:
            # try plain text
            text = file_bytes.decode('utf-8', errors='ignore')
    except Exception as exc:
        logger.warning(f'Resume text extraction failed: {exc}')
    return text.strip()


# ── AI-powered analysis (Hugging Face) ───────────────────────────────────────
def _call_huggingface(prompt: str, max_new_tokens: int = 1024) -> str:
    """
    Call the Hugging Face Inference API and return the generated text.

    The free tier supports:
      - Up to ~2 048 input tokens per request
      - Rate limits apply (requests may queue; retry on 503)
    """
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_new_tokens,
            "temperature": 0.2,          # low temp → more deterministic JSON
            "return_full_text": False,   # return only the generated part
            "do_sample": True,
        },
        "options": {
            "wait_for_model": True,      # wait instead of returning 503
        },
    }

    try:
        response = requests.post(HF_API_URL, headers=HF_HEADERS, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()

        # HF returns a list of dicts: [{"generated_text": "..."}]
        if isinstance(result, list) and result:
            return result[0].get("generated_text", "")
        # Some models return a dict directly
        if isinstance(result, dict):
            return result.get("generated_text", "")
    except requests.exceptions.HTTPError as exc:
        logger.error(f"HF API HTTP error: {exc} — body: {response.text[:300]}")
    except Exception as exc:
        logger.error(f"HF API call failed: {exc}")

    return ""


def analyze_resume_with_ai(
    resume_text: str,
    job_title: str,
    job_description: str,
    job_requirements: list[str],
    candidate_skills: list[str],
) -> dict:
    """
    Use a Hugging Face model to score the resume against the job.
    Returns a dict with scores and skill lists.
    """
    requirements_text = '\n'.join(f'- {r}' for r in (job_requirements or []))
    candidate_skills_text = ', '.join(candidate_skills or [])

    # Mistral instruction format: [INST] ... [/INST]
    prompt = f"""[INST] You are a professional ATS (Applicant Tracking System) analyst.
Analyze this resume against the job requirements and return ONLY valid JSON with no explanation.

## JOB DETAILS
Title: {job_title}
Description: {job_description[:800]}
Requirements:
{requirements_text}

## CANDIDATE PROFILE
Listed Skills: {candidate_skills_text}

## RESUME TEXT
{resume_text[:2000]}

## TASK
Score the candidate 0-100 on each dimension. Be realistic and strict.

Return ONLY this JSON (no markdown fences, no explanation):
{{
  "overall_score": <0-100 float>,
  "skills_score": <0-100 float>,
  "experience_score": <0-100 float>,
  "education_score": <0-100 float>,
  "keyword_score": <0-100 float>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "keywords_found": ["kw1", "kw2"],
  "keywords_missing": ["kw3", "kw4"],
  "summary": "One sentence rationale"
}} [/INST]"""

    raw = _call_huggingface(prompt)
    raw = raw.strip()

    # strip markdown fences if the model added them anyway
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'```\s*$', '', raw)

    # extract the first {...} block in case of extra text
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    try:
        data = json.loads(raw)
        # clamp scores to 0-100
        for key in ('overall_score', 'skills_score', 'experience_score',
                    'education_score', 'keyword_score'):
            data[key] = max(0.0, min(100.0, float(data.get(key, 0))))
        return data
    except Exception as exc:
        logger.error(f'AI ATS JSON parse error: {exc}\nRaw: {raw[:500]}')
        return _fallback_keyword_score(
            resume_text, job_description, job_requirements, candidate_skills
        )


# ── keyword-based fallback ────────────────────────────────────────────────────
def _fallback_keyword_score(
    resume_text: str,
    job_description: str,
    job_requirements: list[str],
    candidate_skills: list[str],
) -> dict:
    """Simple keyword overlap scoring — used when AI call fails."""
    text_lower = resume_text.lower()
    desc_lower = (job_description or '').lower()

    # collect keywords from job
    all_words = set(re.findall(r'\b[a-z]{3,}\b', desc_lower))
    stop = {'and', 'the', 'for', 'are', 'with', 'this', 'that', 'will',
            'have', 'from', 'you', 'they', 'but', 'not', 'can', 'our',
            'all', 'any', 'been', 'has', 'its', 'may', 'more', 'also'}
    keywords = [w for w in all_words if w not in stop][:40]

    found    = [k for k in keywords if k in text_lower]
    missing  = [k for k in keywords if k not in text_lower]

    # skills
    matched_skills = [s for s in (candidate_skills or [])
                      if s.lower() in text_lower or s.lower() in desc_lower]
    req_skills = []
    for req in (job_requirements or []):
        req_skills += re.findall(r'\b[A-Za-z][A-Za-z0-9+#.]{1,}\b', req)
    missing_skills = [s for s in req_skills if s.lower() not in text_lower][:10]

    kw_score  = (len(found) / max(len(keywords), 1)) * 100
    sk_score  = (len(matched_skills) / max(len(req_skills or candidate_skills or [1]), 1)) * 100
    exp_score = 50.0  # cannot determine from keywords alone
    edu_score = 60.0

    overall = (
        sk_score  * SCORE_WEIGHTS['skills'] +
        exp_score * SCORE_WEIGHTS['experience'] +
        kw_score  * SCORE_WEIGHTS['keywords'] +
        edu_score * SCORE_WEIGHTS['education']
    )

    return {
        'overall_score':    round(overall, 1),
        'skills_score':     round(sk_score, 1),
        'experience_score': round(exp_score, 1),
        'education_score':  round(edu_score, 1),
        'keyword_score':    round(kw_score, 1),
        'matched_skills':   matched_skills,
        'missing_skills':   list(set(missing_skills))[:8],
        'keywords_found':   found[:15],
        'keywords_missing': missing[:10],
        'summary':          'Scored via keyword analysis (AI unavailable)',
    }


# ── public API ────────────────────────────────────────────────────────────────
def run_ats_analysis(
    resume_bytes: bytes,
    content_type: str,
    candidate_email: str,
    candidate_skills: list[str],
    job_title: str,
    job_description: str,
    job_requirements: list[str],
    use_ai: bool = True,
) -> dict:
    """
    Full pipeline: extract text → score → return result dict.
    Called by the route handler.
    """
    resume_text = extract_text_from_resume(resume_bytes, content_type)

    if use_ai and resume_text and os.environ.get('HF_API_TOKEN'):
        scores = analyze_resume_with_ai(
            resume_text, job_title, job_description,
            job_requirements, candidate_skills,
        )
        method = 'ai_huggingface'
    else:
        scores = _fallback_keyword_score(
            resume_text, job_description, job_requirements, candidate_skills
        )
        method = 'keyword'

    scores['resume_text']        = resume_text
    scores['has_official_email'] = is_official_email(candidate_email)  # Now always returns True
    scores['analysis_method']    = method
    scores['analyzed_at']        = datetime.utcnow().isoformat()

    return scores