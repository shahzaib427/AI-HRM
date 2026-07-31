"""
ATS Controller
Business-logic layer between routes and services.
"""
import logging
from datetime import datetime

from models import db
from models.ats import ATSAnalysis
from services.ats_service import run_ats_analysis, is_official_email
from services.email_service import send_ats_shortlist_email

logger = logging.getLogger(__name__)

ATS_EMAIL_THRESHOLD = 60.0   # score at or above this triggers auto-email


# ── helpers ───────────────────────────────────────────────────────────────────
def _get_or_create_analysis(candidate_id: str, job_id: str) -> ATSAnalysis:
    record = ATSAnalysis.query.filter_by(
        candidate_id=str(candidate_id),
        job_id=str(job_id) if job_id else None,
    ).first()
    if not record:
        record = ATSAnalysis(
            candidate_id=str(candidate_id),
            job_id=str(job_id) if job_id else None,
        )
        db.session.add(record)
    return record


# ── public API ────────────────────────────────────────────────────────────────
def analyze_and_store(
    candidate_id: str,
    candidate_email: str,
    candidate_name: str,
    candidate_skills: list,
    job_id: str,
    job_title: str,
    job_description: str,
    job_requirements: list,
    resume_bytes: bytes,
    resume_content_type: str,
    company_name: str = 'Our Company',
    auto_email: bool = True,
) -> dict:
    """
    Run ATS analysis, persist results, auto-send email if eligible.
    Returns the ATSAnalysis.to_dict() enriched with email info.
    """
    # Run analysis
    scores = run_ats_analysis(
        resume_bytes=resume_bytes,
        content_type=resume_content_type,
        candidate_email=candidate_email,
        candidate_skills=candidate_skills,
        job_title=job_title,
        job_description=job_description,
        job_requirements=job_requirements,
    )

    # Persist
    record = _get_or_create_analysis(candidate_id, job_id)
    record.overall_score      = scores['overall_score']
    record.skills_score       = scores['skills_score']
    record.experience_score   = scores['experience_score']
    record.education_score    = scores['education_score']
    record.keyword_score      = scores['keyword_score']
    record.matched_skills     = scores.get('matched_skills', [])
    record.missing_skills     = scores.get('missing_skills', [])
    record.keywords_found     = scores.get('keywords_found', [])
    record.keywords_missing   = scores.get('keywords_missing', [])
    record.resume_text        = scores.get('resume_text', '')[:5000]
    record.has_official_email = scores['has_official_email']
    record.analysis_method    = scores['analysis_method']
    record.updated_at         = datetime.utcnow()

    db.session.commit()

    result = record.to_dict()
    result['email_triggered'] = False
    result['email_message']   = ''

    # Auto-email if eligible - EMAIL CHECK REMOVED
    if (
        auto_email
        and scores['overall_score'] >= ATS_EMAIL_THRESHOLD
        and not record.email_notification_sent
    ):
        ok, msg = send_ats_shortlist_email(
            to_email=candidate_email,
            candidate_name=candidate_name,
            job_title=job_title,
            ats_score=scores['overall_score'],
            matched_skills=scores.get('matched_skills', []),
            company_name=company_name,
        )
        if ok:
            record.email_notification_sent = True
            record.email_sent_at           = datetime.utcnow()
            db.session.commit()
            result['email_triggered'] = True
            result['email_message']   = 'Shortlist notification sent to candidate'
        else:
            logger.warning(f'Email failed for candidate {candidate_id}: {msg}')
            result['email_message'] = f'Email failed: {msg}'

    return result


def get_analysis_for_candidate(candidate_id: str, job_id: str = None) -> dict | None:
    """Retrieve existing ATS record for a candidate."""
    q = ATSAnalysis.query.filter_by(candidate_id=str(candidate_id))
    if job_id:
        q = q.filter_by(job_id=str(job_id))
    record = q.order_by(ATSAnalysis.updated_at.desc()).first()
    return record.to_dict() if record else None


def get_bulk_scores(candidate_ids: list[str]) -> dict:
    """Return {candidate_id: score} dict for a list of candidates."""
    records = ATSAnalysis.query.filter(
        ATSAnalysis.candidate_id.in_([str(c) for c in candidate_ids])
    ).all()
    return {r.candidate_id: r.overall_score for r in records}


def manual_trigger_email(candidate_id: str, job_id: str = None) -> tuple[bool, str]:
    """HR manually triggers the shortlist email for a candidate."""
    record = ATSAnalysis.query.filter_by(candidate_id=str(candidate_id)).first()
    if not record:
        return False, 'No ATS record found for this candidate'
    # Email check removed - only score matters now
    if record.overall_score < ATS_EMAIL_THRESHOLD:
        return False, f'ATS score {record.overall_score:.1f}% is below threshold {ATS_EMAIL_THRESHOLD}%'

    # We need candidate details — caller should pass them or we re-query
    return True, 'Use send_ats_shortlist_email() directly with candidate details'