"""
Email Notification Service
Sends interview invitation emails to shortlisted candidates (ATS ≥ 75, official email).
Uses smtplib so it works without any third-party provider.
Configure via environment variables.
"""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

# ── FIX: Load .env file so env vars are available ─────────────────────────────
try:
    from dotenv import load_dotenv
    # Load the .env from the ai/ directory (same folder as this file)
    _env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=_env_path)
    # Also try same directory
    _env_path2 = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path=_env_path2)
except ImportError:
    pass  # dotenv not installed, rely on system env vars

logger = logging.getLogger(__name__)

# ── FIX: Read the correct env var names that match your .env file ─────────────
# Your .env uses EMAIL_USER / EMAIL_PASS / EMAIL_HOST / EMAIL_PORT
# The old code was looking for SMTP_USER / SMTP_PASSWORD / SMTP_HOST / SMTP_PORT
# Now we check BOTH so it works either way

SMTP_HOST = (
    os.environ.get('EMAIL_HOST') or
    os.environ.get('SMTP_HOST') or
    'smtp.gmail.com'
)
SMTP_PORT = int(
    os.environ.get('EMAIL_PORT') or
    os.environ.get('SMTP_PORT') or
    587
)
SMTP_USER = (
    os.environ.get('EMAIL_USER') or
    os.environ.get('SMTP_USER') or
    ''
)
SMTP_PASSWORD = (
    os.environ.get('EMAIL_PASS') or
    os.environ.get('SMTP_PASSWORD') or
    ''
)
FROM_NAME  = os.environ.get('EMAIL_FROM_NAME', 'HR Recruitment Team')
FROM_EMAIL = os.environ.get('EMAIL_FROM', SMTP_USER)

# ── Debug log on startup so you can see what was loaded ──────────────────────
logger.info(f'Email service config — HOST:{SMTP_HOST} PORT:{SMTP_PORT} USER:{SMTP_USER} PASS:{"✓ set" if SMTP_PASSWORD else "✗ MISSING"}')


def _build_ats_notification_html(
    candidate_name: str,
    job_title: str,
    ats_score: float,
    matched_skills: list,
    company_name: str = 'Our Company',
) -> str:
    skills_html = ''.join(
        f'<span style="display:inline-block;background:#e0f2fe;color:#0369a1;'
        f'border-radius:4px;padding:3px 10px;margin:3px;font-size:13px;">{s}</span>'
        for s in matched_skills[:8]
    )
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);
                     padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;
                       letter-spacing:-0.5px;">🎉 Congratulations!</h1>
            <p style="margin:8px 0 0;color:#c7d2fe;font-size:15px;">
              You've been shortlisted for an interview
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px;">
              Dear <strong>{candidate_name}</strong>,
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              We are pleased to inform you that your application for
              <strong style="color:#4f46e5;">{job_title}</strong>
              at <strong>{company_name}</strong> has been reviewed by our ATS system
              and you have achieved an outstanding match score.
            </p>

            <!-- Score card -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
                        padding:20px 24px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 6px;color:#166534;font-size:13px;font-weight:600;
                        text-transform:uppercase;letter-spacing:1px;">Your ATS Match Score</p>
              <p style="margin:0;font-size:48px;font-weight:800;color:#16a34a;
                        line-height:1;">{round(ats_score)}%</p>
              <p style="margin:6px 0 0;color:#15803d;font-size:13px;">Strong Match ✓</p>
            </div>

            <!-- Matched skills -->
            <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 10px;">
              Your matching skills:
            </p>
            <div style="margin:0 0 24px;">{skills_html or '<em style="color:#9ca3af">See full profile</em>'}</div>

            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Our HR team will reach out shortly to schedule your interview.
              Please keep an eye on your inbox and ensure your availability
              for the coming week.
            </p>

            <div style="background:#eff6ff;border-left:4px solid #4f46e5;
                        border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.5;">
                📋 <strong>Next Steps:</strong> You will receive a calendar invite
                with interview details. Please review the job description and
                prepare to discuss your relevant experience.
              </p>
            </div>

            <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
              Best regards,<br>
              <strong style="color:#111827;">{FROM_NAME}</strong><br>
              <span style="color:#9ca3af;">{company_name}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;
                     padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              This email was sent by the Recruitment System. Please do not reply directly.
            </p>
          </td>
        </tr>

      怎么办
    </td></table>
  </table>
</body>
</html>
"""


def send_ats_shortlist_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    ats_score: float,
    matched_skills: list,
    company_name: str = 'Our Company',
) -> tuple[bool, str]:
    """
    Send ATS shortlist notification email.
    Returns (success: bool, message: str).
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error(
            f'SMTP credentials not configured — '
            f'EMAIL_USER="{SMTP_USER}" EMAIL_PASS={"set" if SMTP_PASSWORD else "MISSING"}. '
            f'Check your ai/.env file has EMAIL_USER and EMAIL_PASS set correctly.'
        )
        return False, 'SMTP credentials not configured'

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🎉 You're Shortlisted for {job_title}! (ATS Score: {round(ats_score)}%)"
        msg['From']    = f'{FROM_NAME} <{FROM_EMAIL}>'
        msg['To']      = to_email

        plain = (
            f"Dear {candidate_name},\n\n"
            f"Congratulations! Your application for {job_title} achieved "
            f"an ATS match score of {round(ats_score)}%.\n\n"
            f"Our HR team will contact you shortly to schedule an interview.\n\n"
            f"Best regards,\n{FROM_NAME}"
        )
        html = _build_ats_notification_html(
            candidate_name, job_title, ats_score, matched_skills, company_name
        )

        msg.attach(MIMEText(plain, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        logger.info(f'ATS notification sent to {to_email}')
        return True, 'Email sent successfully'

    except smtplib.SMTPAuthenticationError as exc:
        msg = (
            'Gmail authentication failed. Make sure you are using a Gmail App Password '
            '(not your regular Gmail password). '
            'Generate one at: https://myaccount.google.com/apppasswords'
        )
        logger.error(f'{msg} — {exc}')
        return False, msg
    except smtplib.SMTPException as exc:
        logger.error(f'SMTP error: {exc}')
        return False, f'SMTP error: {exc}'
    except Exception as exc:
        logger.error(f'Email send error: {exc}')
        return False, str(exc)

def send_interview_invitation_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    interview_date: str,
    interview_time: str,
    interview_type: str,
    meeting_link: str = '',
    interviewer: str = '',
    notes: str = '',
    company_name: str = 'Our Company',
) -> tuple[bool, str]:
    """Send formal interview invitation email matching the modal preview."""
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, 'SMTP credentials not configured'

    try:
        # Extract first name
        first_name = candidate_name.split()[0] if candidate_name and ' ' in candidate_name else candidate_name
        
        # Build HTML matching your modal preview EXACTLY
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
            
            <!-- Header with icon -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #d1fae5; border-radius: 9999px; padding: 12px; margin-bottom: 16px;">
                    <svg style="width: 32px; height: 32px; color: #059669;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #111827;">Confirm Interview Invitation</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">An interview invitation email will be sent to:</p>
                <p style="margin: 4px 0 0 0; font-weight: 500; color: #374151;">{to_email}</p>
            </div>

            <!-- Email Preview Section -->
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                <p style="font-weight: 600; color: #111827; margin: 0 0 12px 0;">Email Preview</p>
                
                <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> Interview Invitation - {candidate_name}</p>
                
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="margin: 0 0 8px 0;">Dear {first_name},</p>
                
                <p style="margin: 0 0 12px 0;">Congratulations! We are pleased to inform you that you have been shortlisted for the next stage of our recruitment process.</p>
                
                <!-- Interview Details Box -->
                <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <p style="margin: 0 0 4px 0;"><strong>Interview Date:</strong> {interview_date}</p>
                    <p style="margin: 0 0 4px 0;"><strong>Interview Time:</strong> {interview_time}</p>
                    <p style="margin: 0;"><strong>Interviewer:</strong> {interviewer if interviewer else 'HR Team'}</p>
                </div>
                
                <!-- AI Interview Coach Section -->
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <h4 style="margin: 0 0 8px 0; color: #065f46; font-size: 14px;">🎯 Interview Preparation</h4>
                    <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">To help you prepare and improve your confidence before the interview, we recommend using our AI Interview Coach.</p>
                    <a href="https://ai-interview-master-blush.vercel.app/" target="_blank" style="color: #059669; font-weight: 500; text-decoration: underline;">Start AI Interview Practice</a>
                </div>
                
                <p style="margin: 0 0 8px 0;">The AI Interview Coach provides:</p>
                
                <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #374151;">
                    <li>Mock Interview Questions</li>
                    <li>Technical Interview Practice</li>
                    <li>HR Interview Preparation</li>
                    <li>Confidence Building Sessions</li>
                    <li>Real-Time Feedback</li>
                </ul>
                
                <p style="margin: 0 0 12px 0;">We look forward to speaking with you and wish you the best of luck in your interview.</p>
                
                <p style="margin: 0;">
                    Best Regards,<br>
                    HR Team
                </p>
            </div>
            
        </div>
    </div>
</body>
</html>
"""

        # Plain text version
        plain = f"""Dear {first_name},

Congratulations! We are pleased to inform you that you have been shortlisted for the next stage of our recruitment process.

Interview Date: {interview_date}
Interview Time: {interview_time}
Interviewer: {interviewer if interviewer else 'HR Team'}

To help you prepare and improve your confidence before the interview, we recommend using our AI Interview Coach:
https://ai-interview-master-blush.vercel.app/

The AI Interview Coach provides:
- Mock Interview Questions
- Technical Interview Practice
- HR Interview Preparation
- Confidence Building Sessions
- Real-Time Feedback

We look forward to speaking with you and wish you the best of luck in your interview.

Best Regards,
HR Team"""

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Interview Invitation - {candidate_name}"
        msg['From'] = f'{FROM_NAME} <{FROM_EMAIL}>'
        msg['To'] = to_email
        
        msg.attach(MIMEText(plain, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        logger.info(f'Interview invitation sent to {to_email}')
        return True, 'Interview invitation sent successfully'

    except smtplib.SMTPAuthenticationError as exc:
        error_msg = 'Gmail authentication failed. Use App Password: https://myaccount.google.com/apppasswords'
        logger.error(f'{error_msg} — {exc}')
        return False, error_msg
    except Exception as exc:
        logger.error(f'Interview email error: {exc}')
        return False, str(exc)
 