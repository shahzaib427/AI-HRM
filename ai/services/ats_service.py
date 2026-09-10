"""
ATS Analysis Service - FIXED
Root cause of 0% skills & keywords:
  1. candidate_skills were not extracted from resume text
  2. job_description was being truncated too aggressively
  3. AI prompt was not specific enough about skills extraction
  4. Fallback was dividing by empty list → 0%

NEW FIXES (this revision):
  5. _sanitize_text() strips NUL bytes from pdfplumber/docx output that
     were crashing jsonify() with:
       'A string literal cannot contain NUL (0x00) characters.'
  6. _fallback_keyword_score() now uses ONLY skills from COMMON_SKILLS
     that appear in the job text — not every word from the job prose.
  7. When the AI returns 0 for skills/keywords, we TRUST the AI's
     own lists if it returned any, and only fall back to the
     deterministic scorer when the AI gave no list at all.
  8. Consistency guards: matched_skills/missing_skills can never
     contain the same skill; if matched is non-empty, score > 0.
  9. extract_text_from_resume() sniffs file magic bytes (%PDF / PK)
     instead of trusting the network Content-Type header. Cloudinary
     reports application/octet-stream for PDFs, which was making the
     old code fall through to a plaintext decode and return the raw
     PDF bytes as "text". This is what produced 61183 chars of
     `%PDF 1.7 ... stream x\]}...` garbage.
 10. extract_text_from_resume() now tries PyMuPDF → pypdf → pdfplumber
     in that order, taking the first result with >200 readable chars.
     PyMuPDF is the most tolerant of Word-exported PDFs.
 11. Sanity check: if extracted text still starts with `%PDF-`, we
     discard it rather than feed garbage to the fallback matcher.
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

# ── Skills vocabulary ──────────────────────────────────────────────
# 'r' removed (matches inside every word: "experience", "developer").
# Spelled-out AI terms added so a resume that says "Large Language
# Model" matches a job that says "LLM".
COMMON_SKILLS = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'php', 'ruby',
    'swift', 'kotlin', 'go', 'rust', 'scala', 'matlab',
    'react', 'vue', 'angular', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'next.js', 'nuxt', 'gatsby', 'webpack', 'vite',
    'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'laravel',
    'rails', 'graphql', 'rest', 'api', 'apis',
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle',
    'elasticsearch', 'cassandra', 'dynamodb',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'github',
    'gitlab', 'terraform', 'ansible', 'linux',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'nlp', 'data science', 'sql', 'nosql',
    'agile', 'scrum', 'git', 'jira', 'figma', 'microservices',
    'llm', 'llms', 'fast', 'mern', 'mean', 'rag', 'langchain', 'openai',
    'natural language processing',
    'large language model',
    'large language models',
    'retrieval augmented generation',
    'generative ai',
    'genai',
    'vector database',
    'prompt engineering',
    'fine tuning',
]


# ── FIX 5 ──────────────────────────────────────────────────────────
def _sanitize_text(text) -> str:
    """Strip control characters that break JSON serialization."""
    if text is None:
        return ''
    if not isinstance(text, str):
        try:
            text = str(text)
        except Exception:
            return ''
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text).strip()


# ── Normalizer ─────────────────────────────────────────────────────
def _normalize_for_matching(text: str) -> str:
    """
    Lowercase, collapse whitespace, strip soft hyphens and zero-width
    spaces. Hyphens / underscores / slashes are converted to spaces so
    'LLM-based', 'RAG/LLM', 'fine-tuning' all become clean tokens.
    """
    if not text:
        return ''
    t = text.replace('\xad', '').replace('\u200b', '')
    t = re.sub(r'[\-_/]+', ' ', t)          # hyphen/underscore/slash → space
    t = re.sub(r'\s+', ' ', t)
    return t.lower().strip()


# ── Tolerant skill matcher ─────────────────────────────────────────
def _skill_in_text(skill: str, normalized_text: str) -> bool:
    """
    Word-boundary-aware matcher for a single skill.

    Handles:
      - plain words:            python, llm, nlp
      - plurals / suffixes:     llm  ↔  llms
      - hyphenated variants:    llm  ↔  llm-based
      - slash-separated:        rag  ↔  rag/llm
      - compound w/ symbols:    c++  c#  node.js
    """
    if not skill or not normalized_text:
        return False

    hay = normalized_text.lower()
    hay = re.sub(r'[\-_/]+', ' ', hay)
    hay = re.sub(r'\s+', ' ', hay).strip()

    s_norm = re.sub(r'[\-_/]+', ' ', skill.lower().strip())
    s_norm = re.sub(r'\s+', ' ', s_norm).strip()
    if not s_norm:
        return False

    # Skills with symbols (c++, c#, etc.) — substring is safest.
    if any(c in s_norm for c in '+#'):
        return s_norm in hay

    # node.js / next.js — allow both "node.js" and "node js".
    if '.' in s_norm:
        variant = s_norm.replace('.', ' ')
        variant = re.sub(r'\s+', ' ', variant).strip()
        return (s_norm in hay) or (variant in hay)

    # Plain alpha/digit skill — word boundary + optional plural suffix.
    pattern = rf'\b{re.escape(s_norm)}(?:s|es)?\b'
    return re.search(pattern, hay) is not None


def is_official_email(email: str) -> bool:
    return True


# ── FIX 9 + 10 + 11: robust extraction ─────────────────────────────
def extract_text_from_resume(file_bytes: bytes, content_type: str) -> str:
    """
    Extract text from a resume.

    Content type from the network is unreliable (Cloudinary often
    reports application/octet-stream for PDFs), so we sniff the file
    magic bytes instead of trusting the header.

    Strategy:
      1. If bytes start with %PDF → it's a PDF. Try in order:
         PyMuPDF (fitz) → pypdf → pdfplumber. First result with
         >200 readable chars wins.
      2. If bytes start with PK\\x03\\x04 → it's a zip (docx/xlsx).
         Use python-docx.
      3. Otherwise, try decoding as UTF-8 text.
      4. If the "extracted" text still starts with %PDF-, discard it.
    """
    if not file_bytes:
        return ''

    head = file_bytes[:8]
    is_pdf = head.startswith(b'%PDF-')
    is_zip = head.startswith(b'PK\x03\x04')

    text = ''

    # ── PDF path ────────────────────────────────────────────────────
    if is_pdf or 'pdf' in (content_type or '').lower():
        # 1. PyMuPDF
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype='pdf')
            text = '\n'.join(page.get_text() for page in doc)
            logger.info(f'[ATS] PyMuPDF extracted {len(text)} chars')
        except Exception as exc:
            logger.warning(f'PyMuPDF failed: {exc}')

        # 2. pypdf
        if len(text.strip()) < 200:
            try:
                from pypdf import PdfReader
                import io
                reader = PdfReader(io.BytesIO(file_bytes))
                text = '\n'.join((p.extract_text() or '') for p in reader.pages)
                logger.info(f'[ATS] pypdf extracted {len(text)} chars')
            except Exception as exc:
                logger.warning(f'pypdf failed: {exc}')

        # 3. pdfplumber
        if len(text.strip()) < 200:
            try:
                import pdfplumber, io
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    text = '\n'.join((page.extract_text() or '') for page in pdf.pages)
                logger.info(f'[ATS] pdfplumber extracted {len(text)} chars')
            except Exception as exc:
                logger.warning(f'pdfplumber failed: {exc}')

    # ── DOCX path ───────────────────────────────────────────────────
    elif is_zip or 'word' in (content_type or '').lower() or 'docx' in (content_type or '').lower():
        try:
            import docx, io
            doc = docx.Document(io.BytesIO(file_bytes))
            text = '\n'.join(p.text for p in doc.paragraphs)
            logger.info(f'[ATS] python-docx extracted {len(text)} chars')
        except Exception as exc:
            logger.warning(f'python-docx failed: {exc}')

    # ── Plain text path ─────────────────────────────────────────────
    else:
        try:
            text = file_bytes.decode('utf-8', errors='ignore')
            logger.info(f'[ATS] plaintext decode extracted {len(text)} chars')
        except Exception as exc:
            logger.warning(f'plaintext decode failed: {exc}')

    # ── Sanity check: reject output that is still raw PDF ───────────
    if text and text.lstrip().startswith('%PDF-'):
        logger.error(
            '[ATS] Extraction failed — text still starts with %PDF. '
            'Discarding so the fallback matcher does not see garbage.'
        )
        text = ''

    result = _sanitize_text(text)
    logger.info(f'[ATS] Resume extracted: {len(result)} chars')
    return result


def extract_skills_from_text(text: str, job_skills: list = None) -> list:
    """Auto-extract skills from resume text (fallback when none passed)."""
    normalized = _normalize_for_matching(text)
    found = [s for s in COMMON_SKILLS if _skill_in_text(s, normalized)]
    if job_skills:
        for skill in job_skills:
            if skill and _skill_in_text(skill, normalized) and skill not in found:
                found.append(skill)
    logger.info(f'[ATS] Auto-extracted {len(found)} skills from resume text')
    return found


def extract_job_keywords(job_description: str, job_requirements: list) -> list:
    combined = (job_description or '') + ' ' + ' '.join(str(r) for r in (job_requirements or []))
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
    job_skills = []
    for req in (job_requirements or []):
        job_skills += re.findall(r'\b[A-Za-z][A-Za-z0-9+#.]{1,}\b', str(req))

    effective_skills = candidate_skills if candidate_skills else extract_skills_from_text(resume_text, job_skills)
    logger.info(f'[ATS] Skills for scoring: {len(effective_skills)} (passed-in: {len(candidate_skills or [])})')

    requirements_text = '\n'.join(f'- {r}' for r in (job_requirements or []))
    skills_text = ', '.join(str(s) for s in effective_skills[:30])

    prompt = f"""[INST] You are a strict but fair ATS resume analyst.
Analyze this resume against the job and return ONLY valid JSON.

## JOB
Title: {job_title}
Description: {(job_description or '')[:1500]}
Requirements:
{requirements_text}

## CANDIDATE
Skills found in resume: {skills_text}

## RESUME
{(resume_text or '')[:5000]}

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

        # ── Trust the AI's own lists when it gave them ───────────────
        if data['skills_score'] == 0:
            ai_matched = [str(s) for s in (data.get('matched_skills') or []) if str(s).strip()]
            ai_missing = [str(s) for s in (data.get('missing_skills') or []) if str(s).strip()]

            if ai_matched:
                n = len(ai_matched)
                m = max(n + len(ai_missing), 1)
                data['skills_score'] = round(n / m * 100, 1)
                logger.warning(
                    f'[ATS] AI gave 0% but listed {n} matched skills — '
                    f'trusting AI list, recomputed skills_score={data["skills_score"]}'
                )
            else:
                logger.warning('[ATS] AI gave no skills list — using fallback')
                fb = _fallback_keyword_score(resume_text, job_description, job_requirements, effective_skills)
                data['skills_score']   = fb['skills_score']
                data['matched_skills'] = fb['matched_skills']
                data['missing_skills'] = fb['missing_skills']

        if data['keyword_score'] == 0:
            ai_found = [str(k) for k in (data.get('keywords_found') or []) if str(k).strip()]
            ai_miss  = [str(k) for k in (data.get('keywords_missing') or []) if str(k).strip()]

            if ai_found:
                n = len(ai_found)
                m = max(n + len(ai_miss), 1)
                data['keyword_score'] = round(n / m * 100, 1)
                logger.warning(
                    f'[ATS] AI gave 0% keywords but listed {n} — '
                    f'trusting AI list, recomputed keyword_score={data["keyword_score"]}'
                )
            else:
                fb = _fallback_keyword_score(resume_text, job_description, job_requirements, effective_skills)
                data['keyword_score']    = fb['keyword_score']
                data['keywords_found']   = fb['keywords_found']
                data['keywords_missing'] = fb['keywords_missing']

        # ── Consistency guards ────────────────────────────────────────
        matched_lower = {str(s).strip().lower() for s in (data.get('matched_skills') or [])}
        data['missing_skills'] = [
            s for s in (data.get('missing_skills') or [])
            if str(s).strip().lower() not in matched_lower
        ]
        found_lower = {str(k).strip().lower() for k in (data.get('keywords_found') or [])}
        data['keywords_missing'] = [
            k for k in (data.get('keywords_missing') or [])
            if str(k).strip().lower() not in found_lower
        ]

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


# ── Fallback scorer ────────────────────────────────────────────────
def _fallback_keyword_score(
    resume_text, job_description, job_requirements, candidate_skills
) -> dict:
    """
    Deterministic scoring that uses SKILL VOCABULARIES, not raw job prose.

    Uses _normalize_for_matching + _skill_in_text consistently on BOTH
    sides (job text and resume text) so 'LLMs', 'LLM-based', 'RAG/LLM'
    all match their bare forms.
    """
    normalized_resume = _normalize_for_matching(resume_text)
    normalized_job    = _normalize_for_matching(
        (job_description or '') + ' ' +
        ' '.join(str(r) for r in (job_requirements or []))
    )

    # Build the set of skills the job actually asks for.
    job_skill_set = set()
    for skill in COMMON_SKILLS:
        if _skill_in_text(skill, normalized_job):
            job_skill_set.add(skill.lower())

    for s in (candidate_skills or []):
        if s and _skill_in_text(str(s), normalized_job):
            job_skill_set.add(str(s).lower())

    # If the job had no recognisable skills, use the candidate's set.
    if not job_skill_set:
        job_skill_set = {str(s).lower() for s in (candidate_skills or []) if s}

    # Which of those required skills are in the resume?
    matched_skills = sorted(s for s in job_skill_set if _skill_in_text(s, normalized_resume))
    missing_skills = sorted(s for s in job_skill_set if not _skill_in_text(s, normalized_resume))

    sk_score = (len(matched_skills) / max(len(job_skill_set), 1)) * 100

    # Keywords — same normalizer on both sides.
    keywords = extract_job_keywords(job_description, job_requirements)
    found    = [k for k in keywords if k in normalized_resume]
    missing  = [k for k in keywords if k not in normalized_resume]
    kw_score = (len(found) / max(len(keywords), 1)) * 100

    # Experience / education heuristics
    exp_score = min(40 + (len(resume_text) / 80), 80.0)
    edu_keywords = ['bachelor','master','phd','degree','university',
                    'college','bsc','msc','b.s','m.s','b.e','m.e','bs','ms']
    edu_score = 70.0 if any(k in normalized_resume for k in edu_keywords) else 45.0

    overall = (
        sk_score  * SCORE_WEIGHTS['skills'] +
        exp_score * SCORE_WEIGHTS['experience'] +
        kw_score  * SCORE_WEIGHTS['keywords'] +
        edu_score * SCORE_WEIGHTS['education']
    )
    logger.info(
        f'[ATS] Fallback: skills={sk_score:.0f}% ({len(matched_skills)}/{len(job_skill_set)}) '
        f'kw={kw_score:.0f}% exp={exp_score:.0f}% edu={edu_score:.0f}% → {overall:.0f}%'
    )

    return {
        'overall_score':    round(overall, 1),
        'skills_score':     round(sk_score, 1),
        'experience_score': round(exp_score, 1),
        'education_score':  round(edu_score, 1),
        'keyword_score':    round(kw_score, 1),
        'matched_skills':   matched_skills[:20],
        'missing_skills':   missing_skills[:10],
        'keywords_found':   found[:15],
        'keywords_missing': missing[:10],
        'summary':          'Scored via skill/keyword analysis (AI unavailable)',
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

    scores['resume_text']        = _sanitize_text(resume_text)
    scores['has_official_email'] = is_official_email(candidate_email)
    scores['analysis_method']    = method
    scores['analyzed_at']        = datetime.utcnow().isoformat()

    for k in ('matched_skills', 'missing_skills', 'keywords_found', 'keywords_missing'):
        if isinstance(scores.get(k), list):
            scores[k] = [_sanitize_text(str(s)) for s in scores[k]]

    logger.info(
        f'[ATS] === DONE: {method} | overall={scores["overall_score"]}% '
        f'skills={scores["skills_score"]}% kw={scores["keyword_score"]}% ==='
    )
    return scores