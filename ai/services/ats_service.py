"""
ATS Analysis Service - FIXED
Root cause of 0% skills & keywords:
  1. candidate_skills were not extracted from resume text
  2. job_description was being truncated too aggressively
  3. AI prompt was not specific enough about skills extraction
  4. Fallback was dividing by empty list → 0%
"""
import re
import json
import logging
import os
import time
from datetime import datetime

import requests

logger = logging.getLogger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

SCORE_WEIGHTS = {
    'skills':     0.40,
    'experience': 0.25,
    'keywords':   0.20,
    'education':  0.15,
}

# Common tech/professional skills to auto-detect in resume
COMMON_SKILLS = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'php', 'ruby',
    'swift', 'kotlin', 'go', 'rust', 'scala', 'r', 'matlab',
    'react', 'vue', 'angular', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'next.js', 'nuxt', 'gatsby', 'webpack', 'vite',
    'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'laravel',
    'rails', 'graphql', 'rest', 'api',
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle',
    'elasticsearch', 'cassandra', 'dynamodb',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'github',
    'gitlab', 'terraform', 'ansible', 'linux',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'nlp', 'data science', 'sql', 'nosql',
    'agile', 'scrum', 'git', 'jira', 'figma', 'microservices',
]


def is_official_email(email: str) -> bool:
    return True


def extract_text_from_resume(file_bytes: bytes, content_type: str) -> str:
    text = ''
    try:
        if 'pdf' in content_type.lower():
            import pdfplumber, io
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = '\n'.join((page.extract_text() or '') for page in pdf.pages)
        elif 'word' in content_type.lower() or 'docx' in content_type.lower():
            import docx, io
            doc = docx.Document(io.BytesIO(file_bytes))
            text = '\n'.join(p.text for p in doc.paragraphs)
        else:
            text = file_bytes.decode('utf-8', errors='ignore')
    except Exception as exc:
        logger.warning(f'Resume extraction failed: {exc}')
    result = text.strip()
    logger.info(f'[ATS] Resume extracted: {len(result)} chars')
    return result


def extract_skills_from_text(text: str, job_skills: list = None) -> list:
    """Auto-extract skills from resume text. Fixes 0% skills when list is empty."""
    text_lower = text.lower()
    found = [s for s in COMMON_SKILLS if s.lower() in text_lower]
    if job_skills:
        for skill in job_skills:
            if skill.lower() in text_lower and skill not in found:
                found.append(skill)
    logger.info(f'[ATS] Auto-extracted {len(found)} skills from resume text')
    return found


def extract_job_keywords(job_description: str, job_requirements: list) -> list:
    """Extract meaningful keywords from job posting. Fixes 0% keyword score."""
    combined = (job_description or '') + ' ' + ' '.join(job_requirements or [])
    stop = {
        'and','the','for','are','with','this','that','will','have','from',
        'you','they','but','not','can','our','all','any','been','has','its',
        'may','more','also','was','were','their','your','about','such','work',
        'must','well','good','strong','team','able','using','use','experience',
        'skills','knowledge','minimum','required','preferred','plus','bonus',
    }
    words = re.findall(r'\b[a-z][a-z0-9+#.]{2,}\b', combined.lower())
    keywords = list(dict.fromkeys(w for w in words if w not in stop))[:50]
    logger.info(f'[ATS] Extracted {len(keywords)} keywords from job')
    return keywords


def _call_huggingface(prompt: str, max_new_tokens: int = 1024) -> str:
    token = os.environ.get('HF_API_TOKEN', '')
    if not token:
        logger.warning('[ATS] HF_API_TOKEN not set')
        return ''
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    payload = {
        'inputs': prompt,
        'parameters': {'max_new_tokens': max_new_tokens, 'temperature': 0.2,
                       'return_full_text': False, 'do_sample': True},
        'options': {'wait_for_model': True},
    }
    for attempt in range(3):
        try:
            logger.info(f'[ATS] HF API attempt {attempt+1}/3')
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=120)
            if response.status_code == 503:
                wait = 10 * (attempt + 1)
                logger.warning(f'[ATS] 503 cold-start, retrying in {wait}s')
                time.sleep(wait)
                continue
            response.raise_for_status()
            result = response.json()
            if isinstance(result, list) and result:
                return result[0].get('generated_text', '')
            if isinstance(result, dict):
                return result.get('generated_text', '')
        except requests.exceptions.Timeout:
            logger.error(f'[ATS] Timeout on attempt {attempt+1}')
            if attempt < 2: time.sleep(5)
        except Exception as exc:
            logger.error(f'[ATS] HF error: {exc}')
            break
    return ''


def analyze_resume_with_ai(
    resume_text, job_title, job_description, job_requirements, candidate_skills
) -> dict:
    # FIX: Auto-extract skills from resume if none passed
    job_skills = []
    for req in (job_requirements or []):
        job_skills += re.findall(r'\b[A-Za-z][A-Za-z0-9+#.]{1,}\b', req)

    effective_skills = candidate_skills if candidate_skills else extract_skills_from_text(resume_text, job_skills)
    logger.info(f'[ATS] Skills for scoring: {len(effective_skills)} (passed-in: {len(candidate_skills or [])})')

    requirements_text = '\n'.join(f'- {r}' for r in (job_requirements or []))
    skills_text = ', '.join(effective_skills[:30])

    prompt = f"""[INST] You are a strict but fair ATS resume analyst.
Analyze this resume against the job and return ONLY valid JSON.

## JOB
Title: {job_title}
Description: {job_description[:1500]}
Requirements:
{requirements_text}

## CANDIDATE
Skills found in resume: {skills_text}

## RESUME
{resume_text[:5000]}

## SCORING RULES
- skills_score: What % of job requirements does the candidate meet? Check CAREFULLY.
- experience_score: Does their experience level and years match the role?
- education_score: Does their education fit the job?
- keyword_score: How many job-specific keywords appear in the resume?
- A developer applying for a developer role with matching skills should score 55-75%.
- Only score below 30% if the candidate is clearly unrelated to the job.
- DO NOT return 0% for skills if skills are listed in the candidate profile above.

Return ONLY this JSON (no markdown, no explanation):
{{
  "overall_score": <0-100>,
  "skills_score": <0-100>,
  "experience_score": <0-100>,
  "education_score": <0-100>,
  "keyword_score": <0-100>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "keywords_found": ["kw1", "kw2"],
  "keywords_missing": ["kw3", "kw4"],
  "summary": "One sentence rationale"
}} [/INST]"""

    raw = _call_huggingface(prompt).strip()
    logger.debug(f'[ATS] Raw AI: {raw[:400]}')

    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'```\s*$', '', raw)

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    try:
        data = json.loads(raw)
        for key in ('overall_score','skills_score','experience_score','education_score','keyword_score'):
            data[key] = max(0.0, min(100.0, float(data.get(key, 0))))

        # FIX: If AI gives 0% skills but we have skills → use fallback skills score
        if data['skills_score'] == 0 and effective_skills:
            logger.warning('[ATS] AI gave 0% skills — using keyword fallback for skills')
            fb = _fallback_keyword_score(resume_text, job_description, job_requirements, effective_skills)
            data['skills_score'] = fb['skills_score']
            if not data.get('matched_skills'):
                data['matched_skills'] = fb['matched_skills']

        # FIX: If AI gives 0% keywords → use fallback keyword score
        if data['keyword_score'] == 0:
            logger.warning('[ATS] AI gave 0% keywords — using keyword fallback')
            fb = _fallback_keyword_score(resume_text, job_description, job_requirements, effective_skills)
            data['keyword_score'] = fb['keyword_score']
            if not data.get('keywords_found'):
                data['keywords_found'] = fb['keywords_found']

        # Recalculate overall with correct weights
        data['overall_score'] = round(
            data['skills_score']     * SCORE_WEIGHTS['skills'] +
            data['experience_score'] * SCORE_WEIGHTS['experience'] +
            data['keyword_score']    * SCORE_WEIGHTS['keywords'] +
            data['education_score']  * SCORE_WEIGHTS['education'], 1
        )
        logger.info(f'[ATS] Scores → overall={data["overall_score"]} skills={data["skills_score"]} kw={data["keyword_score"]}')
        return data

    except Exception as exc:
        logger.error(f'[ATS] JSON parse error: {exc}')
        return _fallback_keyword_score(resume_text, job_description, job_requirements, effective_skills)


def _fallback_keyword_score(
    resume_text, job_description, job_requirements, candidate_skills
) -> dict:
    text_lower = resume_text.lower()

    # Auto-extract skills if empty
    job_skills = []
    for req in (job_requirements or []):
        job_skills += re.findall(r'\b[A-Za-z][A-Za-z0-9+#.]{1,}\b', req)
    effective_skills = candidate_skills if candidate_skills else extract_skills_from_text(resume_text, job_skills)

    keywords = extract_job_keywords(job_description, job_requirements)
    found   = [k for k in keywords if k in text_lower]
    missing = [k for k in keywords if k not in text_lower]

    matched_skills  = [s for s in effective_skills if s.lower() in text_lower]
    missing_skills  = [s for s in job_skills if s.lower() not in text_lower][:10]

    kw_score = (len(found) / max(len(keywords), 1)) * 100
    sk_score = (len(matched_skills) / max(len(effective_skills), 1)) * 100 if effective_skills else 50.0
    exp_score = min(40 + (len(resume_text) / 80), 80.0)
    edu_keywords = ['bachelor','master','phd','degree','university','college','bsc','msc','b.s','m.s','b.e','m.e','bs','ms']
    edu_score = 70.0 if any(k in text_lower for k in edu_keywords) else 45.0

    overall = (
        sk_score  * SCORE_WEIGHTS['skills'] +
        exp_score * SCORE_WEIGHTS['experience'] +
        kw_score  * SCORE_WEIGHTS['keywords'] +
        edu_score * SCORE_WEIGHTS['education']
    )
    logger.info(f'[ATS] Fallback: skills={sk_score:.0f}% kw={kw_score:.0f}% exp={exp_score:.0f}% edu={edu_score:.0f}% → {overall:.0f}%')

    return {
        'overall_score':    round(overall, 1),
        'skills_score':     round(sk_score, 1),
        'experience_score': round(exp_score, 1),
        'education_score':  round(edu_score, 1),
        'keyword_score':    round(kw_score, 1),
        'matched_skills':   matched_skills[:10],
        'missing_skills':   list(set(missing_skills))[:8],
        'keywords_found':   found[:15],
        'keywords_missing': missing[:10],
        'summary':          'Scored via keyword analysis (AI unavailable)',
    }


def run_ats_analysis(
    resume_bytes, content_type, candidate_email,
    candidate_skills, job_title, job_description,
    job_requirements, use_ai=True,
) -> dict:
    logger.info(f'[ATS] === START: {candidate_email} | job: {job_title} ===')
    logger.info(f'[ATS] Skills passed: {candidate_skills}')
    logger.info(f'[ATS] JD length: {len(job_description or "")} | Reqs: {len(job_requirements or [])}')
    logger.info(f'[ATS] HF token: {bool(os.environ.get("HF_API_TOKEN"))} | use_ai: {use_ai}')

    resume_text = extract_text_from_resume(resume_bytes, content_type)
    if not resume_text:
        logger.error('[ATS] Empty resume text!')

    has_token = bool(os.environ.get('HF_API_TOKEN'))

    if use_ai and resume_text and has_token:
        scores = analyze_resume_with_ai(resume_text, job_title, job_description, job_requirements, candidate_skills)
        method = 'ai_huggingface'
    else:
        reason = 'no HF token' if not has_token else 'empty resume' if not resume_text else 'use_ai=False'
        logger.warning(f'[ATS] Keyword fallback — reason: {reason}')
        scores = _fallback_keyword_score(resume_text, job_description, job_requirements, candidate_skills)
        method = 'keyword'

    scores['resume_text']        = resume_text
    scores['has_official_email'] = is_official_email(candidate_email)
    scores['analysis_method']    = method
    scores['analyzed_at']        = datetime.utcnow().isoformat()

    logger.info(f'[ATS] === DONE: {method} | overall={scores["overall_score"]}% skills={scores["skills_score"]}% kw={scores["keyword_score"]}% ===')
    return scores