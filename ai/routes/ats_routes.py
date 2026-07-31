"""
ATS Routes - FIXED (3 bugs)

Bug 1: _jobObj from Mongoose populate is partial (only has title/dept/location)
       Fix: Always fetch full job separately using jobId

Bug 2: candidate_skills is ['python react django'] — one string not a list
       Fix: Split the string into proper list

Bug 3: No HF token → keyword fallback → job description empty → 0% scores
       Fix: Build synthetic job description from job title + skills so
            keyword matching works even without a real description
"""
import os
import logging
from functools import wraps
from flask import Blueprint, request, jsonify
from models import db
from models.ats import ATSAnalysis
import requests as http_requests
from controllers.ats_controller import (
    analyze_and_store,
    get_analysis_for_candidate,
    get_bulk_scores,
)
from services.email_service import (
    send_ats_shortlist_email,
    send_interview_invitation_email,
)

logger = logging.getLogger(__name__)
ats_bp = Blueprint('ats', __name__, url_prefix='/api/ats')

COMPANY_NAME = 'Our Company'


def internal_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        expected = os.environ.get('INTERNAL_API_SECRET', 'internal-secret-change-me')
        received = request.headers.get('X-Internal-Secret', '')
        if received != expected:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


def _node_headers() -> dict:
    token = os.environ.get('NODE_INTERNAL_JWT', '')
    return {'Authorization': f'Bearer {token}'}


def _get_candidate_flexible(candidate_id: str) -> dict | None:
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/candidates/{candidate_id}',
            headers=_node_headers(), timeout=10,
        )
        if res.status_code == 200:
            body      = res.json()
            candidate = body.get('data') or body.get('candidate') or body
            if isinstance(candidate, dict):
                candidate.setdefault('firstName', candidate.get('first_name', ''))
                candidate.setdefault('lastName',  candidate.get('last_name', ''))
                candidate.setdefault('skills',    candidate.get('skills', []))

                # Store partial jobObj but ALWAYS fetch full job separately
                job_ref = candidate.get('jobId') or candidate.get('job_id') or {}
                if isinstance(job_ref, dict):
                    candidate['_jobObj_partial'] = job_ref          # partial — do NOT use for description
                    candidate['jobId'] = str(job_ref.get('_id', ''))
                elif isinstance(job_ref, str):
                    candidate['jobId'] = job_ref

                logger.info(f'[candidate] {candidate.get("firstName")} {candidate.get("lastName")}')
                logger.info(f'[candidate] raw skills = {candidate.get("skills")}')
                logger.info(f'[candidate] jobId = {candidate.get("jobId")}')
                return candidate
    except Exception as exc:
        logger.error(f'_get_candidate_flexible error: {exc}')
    return None


def _normalize_skills(skills_raw) -> list:
    """
    FIX BUG 2: skills comes as ['python react django mongodb'] — one string.
    Split it into proper list: ['python', 'react', 'django', 'mongodb']
    """
    if not skills_raw:
        return []

    result = []
    for item in skills_raw:
        if isinstance(item, str):
            # Split by comma, space, or semicolon
            parts = [s.strip() for s in item.replace(',', ' ').replace(';', ' ').split()]
            result.extend(p for p in parts if p)
        else:
            result.append(str(item))

    logger.info(f'[skills] Normalized {skills_raw} → {result}')
    return result


def _get_job_full(job_id: str) -> dict | None:
    """
    FIX BUG 1: Always fetch the FULL job object from Node.
    The _jobObj from Mongoose populate only has title/dept/location.
    We need description + requirements + skillsRequired.
    """
    if not job_id:
        logger.warning('[job fetch] No job_id provided')
        return None
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/jobs/{job_id}',
            headers=_node_headers(), timeout=10,
        )
        logger.info(f'[job fetch] status={res.status_code} id={job_id}')
        if res.status_code == 200:
            body = res.json()
            job  = body.get('data') or body.get('job') or body
            logger.info(f'[job] title       = {job.get("title")}')
            logger.info(f'[job] description = {len(job.get("description") or "")} chars')
            logger.info(f'[job] requirements= {len(job.get("requirements") or [])} items')
            logger.info(f'[job] skills req  = {job.get("skillsRequired")}')
            return job
        logger.warning(f'[job fetch] failed {res.status_code}')
    except Exception as exc:
        logger.error(f'_get_job_full error: {exc}')
    return None


def _build_job_description(job: dict, candidate_skills: list = None) -> str:
    """
    FIX BUG 3: Build rich description even if job.description is empty.
    Uses all available job fields + candidate skills as context.
    """
    parts = []

    desc = (job.get('description') or '').strip()
    if desc:
        parts.append(desc)

    reqs = job.get('requirements') or []
    if reqs:
        parts.append('Requirements: ' + '. '.join(str(r) for r in reqs))

    resps = job.get('responsibilities') or []
    if resps:
        parts.append('Responsibilities: ' + '. '.join(str(r) for r in resps))

    skills = job.get('skillsRequired') or []
    if skills:
        parts.append('Skills required: ' + ', '.join(str(s) for s in skills))

    title = job.get('title', '')
    dept  = job.get('department', '')
    level = job.get('experienceLevel', '')

    # FIX: If still empty, synthesize from title + department + level
    if not parts:
        synthetic = f"We are looking for a {title}"
        if level:
            synthetic += f" ({level} level)"
        if dept:
            synthetic += f" in the {dept} department"
        if candidate_skills:
            synthetic += f". Required skills include: {', '.join(candidate_skills)}"
        parts.append(synthetic)
        logger.warning(f'[job desc] Job has no description — synthesized: {synthetic}')

    combined = '\n'.join(parts)
    logger.info(f'[job desc] Final description: {len(combined)} chars')
    return combined


def _build_requirements(job: dict, candidate_skills: list = None) -> list:
    """Merge requirements + skillsRequired into one list."""
    reqs = [str(r) for r in (job.get('requirements') or []) if r]

    for s in (job.get('skillsRequired') or []):
        if s and str(s) not in reqs:
            reqs.append(str(s))

    # If still empty, use candidate skills as requirements context
    if not reqs and candidate_skills:
        reqs = candidate_skills[:]
        logger.warning('[job reqs] No requirements found — using candidate skills as proxy')

    logger.info(f'[job reqs] Final requirements: {len(reqs)} items → {reqs[:5]}')
    return reqs


def _fetch_resume_bytes(candidate_id: str) -> tuple[bytes | None, str]:
    content_type = 'application/pdf'
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/candidates/{candidate_id}/resume',
            headers=_node_headers(), timeout=30,
        )
        logger.info(f'[resume] status={res.status_code} size={len(res.content)}')
        if res.status_code == 200:
            return res.content, res.headers.get('Content-Type', content_type)
    except Exception as exc:
        logger.error(f'_fetch_resume_bytes error: {exc}')
    return None, content_type


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ats/analyze/<candidate_id>
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/analyze/<string:candidate_id>', methods=['POST'])
@internal_auth
def analyze_candidate(candidate_id: str):
    try:
        data            = request.get_json(silent=True) or {}
        force_reanalyze = data.get('force_reanalyze', False)

        if not force_reanalyze:
            existing = get_analysis_for_candidate(candidate_id)
            if existing:
                logger.info(f'[ATS] Returning cached for {candidate_id}')
                return jsonify({'success': True, 'data': existing, 'source': 'cached'}), 200

        # Step 1: Candidate
        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        # FIX BUG 2: Normalize skills from string to list
        raw_skills       = candidate.get('skills') or []
        candidate_skills = _normalize_skills(raw_skills)

        # FIX BUG 1: Always fetch FULL job — never use partial _jobObj
        job_id = str(candidate.get('jobId') or candidate.get('job_id', ''))
        job    = _get_job_full(job_id)

        # Step 3: Build job data
        job_title        = (job.get('title', '') if job else '') or 'Position'
        job_description  = _build_job_description(job, candidate_skills) if job else (
            # No job at all — build from skills only
            f"Looking for a developer with skills: {', '.join(candidate_skills)}" if candidate_skills else ''
        )
        job_requirements = _build_requirements(job, candidate_skills) if job else candidate_skills[:]

        logger.info(f'[ATS] === FINAL INPUTS ===')
        logger.info(f'[ATS] job_title       = {job_title}')
        logger.info(f'[ATS] job_desc length = {len(job_description)}')
        logger.info(f'[ATS] requirements    = {job_requirements[:5]}')
        logger.info(f'[ATS] skills (fixed)  = {candidate_skills}')

        # Step 4: Resume
        resume_bytes, content_type = _fetch_resume_bytes(candidate_id)
        if not resume_bytes:
            return jsonify({'success': False, 'message': 'No resume found'}), 400

        # Step 5: Analyze
        result = analyze_and_store(
            candidate_id=candidate_id,
            candidate_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName','')} {candidate.get('lastName','')}".strip(),
            candidate_skills=candidate_skills,
            job_id=job_id,
            job_title=job_title,
            job_description=job_description,
            job_requirements=job_requirements,
            resume_bytes=resume_bytes,
            resume_content_type=content_type,
            company_name=COMPANY_NAME,
            auto_email=True,
        )

        logger.info(f'[ATS] RESULT: overall={result.get("overall_score")} skills={result.get("skills_score")} kw={result.get("keyword_score")}')
        return jsonify({'success': True, 'data': result, 'source': 'fresh'}), 200

    except Exception as exc:
        logger.exception(f'ATS analyze error: {candidate_id}')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/ats/score/<candidate_id>
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/score/<string:candidate_id>', methods=['GET'])
@internal_auth
def get_score(candidate_id: str):
    try:
        result = get_analysis_for_candidate(candidate_id, request.args.get('job_id'))
        return jsonify({'success': True, 'data': result}), 200
    except Exception as exc:
        logger.exception('ATS score fetch error')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ats/bulk-scores
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/bulk-scores', methods=['POST'])
@internal_auth
def bulk_scores():
    try:
        ids = (request.get_json(silent=True) or {}).get('candidate_ids', [])
        return jsonify({'success': True, 'data': get_bulk_scores(ids)}), 200
    except Exception as exc:
        logger.exception('Bulk scores error')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ats/send-shortlist-email/<candidate_id>
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/send-shortlist-email/<string:candidate_id>', methods=['POST'])
@internal_auth
def send_shortlist_email(candidate_id: str):
    try:
        record = ATSAnalysis.query.filter_by(candidate_id=candidate_id).first()
        if not record:
            return jsonify({'success': False, 'message': 'No ATS record found'}), 404
        if record.overall_score < 60:
            return jsonify({'success': False, 'message': f'Score {record.overall_score:.1f}% below 60% threshold'}), 400

        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        ok, msg = send_ats_shortlist_email(
            to_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName','')} {candidate.get('lastName','')}".strip(),
            job_title=candidate.get('jobTitle', 'Position'),
            ats_score=record.overall_score,
            matched_skills=record.matched_skills,
            company_name=COMPANY_NAME,
        )
        if ok:
            from datetime import datetime
            record.email_notification_sent = True
            record.email_sent_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'success': True, 'message': 'Email sent'}), 200
        return jsonify({'success': False, 'message': msg}), 500
    except Exception as exc:
        logger.exception('Send shortlist email error')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/ats/eligible-candidates
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/eligible-candidates', methods=['GET'])
@internal_auth
def eligible_candidates():
    try:
        threshold = float(request.args.get('threshold', 60))
        records   = ATSAnalysis.query.filter(
            ATSAnalysis.overall_score >= threshold
        ).order_by(ATSAnalysis.overall_score.desc()).all()
        return jsonify({'success': True, 'data': [r.to_dict() for r in records], 'count': len(records)}), 200
    except Exception as exc:
        logger.exception('Eligible candidates error')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/ats/schedule-interview
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/schedule-interview', methods=['POST'])
@internal_auth
def schedule_interview_ats():
    try:
        body = request.get_json(silent=True) or {}
        candidate_id = body.get('candidateId')
        if not candidate_id or not body.get('date') or not body.get('time'):
            return jsonify({'success': False, 'message': 'candidateId, date, time required'}), 400

        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        ok, msg = send_interview_invitation_email(
            to_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName','')} {candidate.get('lastName','')}".strip(),
            job_title=candidate.get('jobTitle', 'Position'),
            interview_date=body.get('date', ''),
            interview_time=body.get('time', ''),
            interview_type=body.get('interviewType', 'Virtual'),
            meeting_link=body.get('meetingLink', ''),
            interviewer=body.get('interviewer', ''),
            notes=body.get('notes', ''),
            company_name=COMPANY_NAME,
        )
        if ok:
            return jsonify({'success': True, 'message': 'Interview invitation sent'}), 200
        return jsonify({'success': False, 'message': msg}), 500
    except Exception as exc:
        logger.exception('Schedule interview error')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/ats/stats
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/stats', methods=['GET'])
@internal_auth
def ats_stats():
    try:
        from sqlalchemy import func
        total       = ATSAnalysis.query.count()
        avg_score   = db.session.query(func.avg(ATSAnalysis.overall_score)).scalar() or 0
        high_match  = ATSAnalysis.query.filter(ATSAnalysis.overall_score >= 60).count()
        emails_sent = ATSAnalysis.query.filter(ATSAnalysis.email_notification_sent == True).count()
        return jsonify({'success': True, 'data': {
            'total_analyzed': total, 'average_score': round(avg_score, 1),
            'high_match_count': high_match, 'eligible_count': high_match,
            'emails_sent': emails_sent,
        }}), 200
    except Exception as exc:
        logger.exception('ATS stats error')
        return jsonify({'success': False, 'message': str(exc)}), 500