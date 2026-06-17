"""
ATS Routes Blueprint
All /api/ats/* endpoints.
"""
import os
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
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


# ── Internal auth decorator ───────────────────────────────────────────────────
def internal_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        expected = os.environ.get('INTERNAL_API_SECRET', 'internal-secret-change-me')
        received = request.headers.get('X-Internal-Secret', '')
        logger.info(f"[internal_auth] match={received == expected}")
        if received != expected:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


# ── Node.js REST helpers ──────────────────────────────────────────────────────
def _node_headers() -> dict:
    token = os.environ.get('NODE_INTERNAL_JWT', '')
    return {'Authorization': f'Bearer {token}'}


def _get_candidate_flexible(candidate_id: str) -> dict | None:
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/candidates/{candidate_id}',
            headers=_node_headers(),
            timeout=10,
        )
        logger.info(f'[candidate fetch] status={res.status_code} id={candidate_id}')
        if res.status_code == 200:
            body      = res.json()
            candidate = body.get('data') or body.get('candidate') or body
            if isinstance(candidate, dict):
                # Normalise first/last name fields
                candidate.setdefault('firstName', candidate.get('firstName') or candidate.get('first_name', ''))
                candidate.setdefault('lastName',  candidate.get('lastName')  or candidate.get('last_name', ''))
                candidate.setdefault('skills',    candidate.get('skills', []))
                # jobId may be a nested object from Mongoose populate
                job_ref = candidate.get('jobId') or candidate.get('job_id') or {}
                if isinstance(job_ref, dict):
                    candidate['_jobObj'] = job_ref
                    candidate['jobId']   = str(job_ref.get('_id', ''))
                return candidate
        else:
            logger.warning(f'[candidate fetch] {res.status_code}: {res.text[:300]}')
    except Exception as exc:
        logger.error(f'_get_candidate_flexible error: {exc}')
    return None


def _get_job_flexible(job_id: str) -> dict | None:
    if not job_id:
        return None
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/jobs/{job_id}',
            headers=_node_headers(),
            timeout=10,
        )
        if res.status_code == 200:
            body = res.json()
            return body.get('data') or body.get('job') or body
        logger.warning(f'[job fetch] {res.status_code}: {res.text[:300]}')
    except Exception as exc:
        logger.error(f'_get_job_flexible error: {exc}')
    return None


def _fetch_resume_bytes(candidate_id: str) -> tuple[bytes | None, str]:
    content_type = 'application/pdf'
    try:
        node_api = os.environ.get('NODE_API_URL', 'http://localhost:5000/api')
        res = http_requests.get(
            f'{node_api}/recruitment/candidates/{candidate_id}/resume',
            headers=_node_headers(),
            timeout=30,
        )
        logger.info(f'[resume fetch] status={res.status_code} id={candidate_id}')
        if res.status_code == 200:
            ct = res.headers.get('Content-Type', content_type)
            return res.content, ct
        logger.warning(f'[resume fetch] {res.status_code}: {res.text[:300]}')
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

        # Return cached result unless forced
        if not force_reanalyze:
            existing = get_analysis_for_candidate(candidate_id)
            if existing:
                return jsonify({'success': True, 'data': existing, 'source': 'cached'}), 200

        # Fetch candidate from Node
        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        # Use embedded job object if Mongoose already populated it
        job = candidate.get('_jobObj') or _get_job_flexible(
            str(candidate.get('jobId') or candidate.get('job_id', ''))
        )

        # Fetch resume bytes from Node
        resume_bytes, content_type = _fetch_resume_bytes(candidate_id)
        if not resume_bytes:
            return jsonify({'success': False, 'message': 'No resume found for candidate'}), 400

        result = analyze_and_store(
            candidate_id=candidate_id,
            candidate_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName', '')} {candidate.get('lastName', '')}".strip(),
            candidate_skills=candidate.get('skills', []),
            job_id=str(job.get('_id', '')) if job else '',
            job_title=job.get('title', 'Position') if job else 'Position',
            job_description=job.get('description', '') if job else '',
            job_requirements=job.get('requirements', []) if job else [],
            resume_bytes=resume_bytes,
            resume_content_type=content_type,
            company_name=COMPANY_NAME,
            auto_email=True,
        )

        return jsonify({'success': True, 'data': result, 'source': 'fresh'}), 200

    except Exception as exc:
        logger.exception(f'ATS analyze error for candidate {candidate_id}')
        return jsonify({'success': False, 'message': str(exc)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/ats/score/<candidate_id>
# ═══════════════════════════════════════════════════════════════════════════════
@ats_bp.route('/score/<string:candidate_id>', methods=['GET'])
@internal_auth
def get_score(candidate_id: str):
    try:
        job_id = request.args.get('job_id')
        result = get_analysis_for_candidate(candidate_id, job_id)
        if result:
            return jsonify({'success': True, 'data': result}), 200
        return jsonify({'success': True, 'data': None, 'message': 'Not yet analyzed'}), 200
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
        ids    = (request.get_json(silent=True) or {}).get('candidate_ids', [])
        scores = get_bulk_scores(ids)
        return jsonify({'success': True, 'data': scores}), 200
    except Exception as exc:
        logger.exception('Bulk ATS scores error')
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

        # Email check removed - only score matters
        if record.overall_score < 60:
            return jsonify({
                'success': False,
                'message': f'ATS score {record.overall_score:.1f}% is below threshold 60%'
            }), 400

        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        ok, msg = send_ats_shortlist_email(
            to_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName', '')} {candidate.get('lastName', '')}".strip(),
            job_title=candidate.get('jobTitle', 'Position'),
            ats_score=record.overall_score,
            matched_skills=record.matched_skills,
            company_name=COMPANY_NAME,
        )

        if ok:
            record.email_notification_sent = True
            from datetime import datetime
            record.email_sent_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'success': True, 'message': 'Email sent successfully'}), 200
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
        threshold = float(request.args.get('threshold', 60))  # Changed from 75 to 60
        # Email filter removed
        records   = ATSAnalysis.query.filter(
            ATSAnalysis.overall_score >= threshold,
        ).order_by(ATSAnalysis.overall_score.desc()).all()

        return jsonify({
            'success': True,
            'data':    [r.to_dict() for r in records],
            'count':   len(records),
        }), 200
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
        body           = request.get_json(silent=True) or {}
        candidate_id   = body.get('candidateId')
        interview_date = body.get('date', '')
        interview_time = body.get('time', '')
        interview_type = body.get('interviewType', 'Virtual')
        meeting_link   = body.get('meetingLink', '')
        interviewer    = body.get('interviewer', '')
        notes          = body.get('notes', '')

        if not candidate_id or not interview_date or not interview_time:
            return jsonify({'success': False, 'message': 'candidateId, date, and time are required'}), 400

        candidate = _get_candidate_flexible(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404

        ok, msg = send_interview_invitation_email(
            to_email=candidate.get('email', ''),
            candidate_name=f"{candidate.get('firstName', '')} {candidate.get('lastName', '')}".strip(),
            job_title=candidate.get('jobTitle', 'Position'),
            interview_date=interview_date,
            interview_time=interview_time,
            interview_type=interview_type,
            meeting_link=meeting_link,
            interviewer=interviewer,
            notes=notes,
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
        high_match  = ATSAnalysis.query.filter(ATSAnalysis.overall_score >= 60).count()  # Changed from 75 to 60
        # Email filter removed
        eligible    = ATSAnalysis.query.filter(
            ATSAnalysis.overall_score >= 60,
        ).count()
        emails_sent = ATSAnalysis.query.filter(
            ATSAnalysis.email_notification_sent == True
        ).count()

        return jsonify({
            'success': True,
            'data': {
                'total_analyzed':   total,
                'average_score':    round(avg_score, 1),
                'high_match_count': high_match,
                'eligible_count':   eligible,
                'emails_sent':      emails_sent,
            }
        }), 200
    except Exception as exc:
        logger.exception('ATS stats error')
        return jsonify({'success': False, 'message': str(exc)}), 500