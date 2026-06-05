import os
import logging
import aiosmtplib
from email.message import EmailMessage
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")


async def _send_email(to: str, subject: str, body: str) -> bool:
    """
    Internal helper: sends a plain-text email via SMTP with STARTTLS.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        body: Plain-text email body.

    Returns:
        True if the email was sent successfully, False on any SMTP error.
        Failures are logged but never raised — the caller handles fallback.
    """
    if not SMTP_USER or not SMTP_PASSWORD or not EMAIL_FROM:
        logger.error("SMTP credentials are not configured. Cannot send email.")
        return False

    msg = EmailMessage()
    msg["From"] = EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
        )
        logger.info(f"Email sent successfully to {to} | subject=\"{subject}\"")
        return True
    except Exception as e:
        logger.error(f"SMTP send failed to {to} | subject=\"{subject}\" | error={e}")
        return False


async def send_referral_to_clinic(
    referral_id: str,
    confirmation_token: str,
    clinic: dict,
    patient: dict,
    assessment: dict,
) -> bool:
    """
    Sends the referral assignment email to the clinic.

    Args:
        referral_id: Unique ID of the referral record.
        confirmation_token: One-time token for the confirm/decline action URLs.
        clinic: Clinic dict from partner_clinics.json. Expected keys:
                name, email, response_window_hours.
        patient: Patient contact dict. Expected keys:
                 name, email, phone, preferred_date, preferred_time, notes.
        assessment: Assessment summary dict. Expected keys: score, tier.
                    Raw answers are never included.

    Returns:
        True if sent successfully, False on SMTP error.
    """
    clinic_name = clinic.get("name", "Partner Clinic")
    clinic_email = clinic.get("email", "")
    response_hours = clinic.get("response_window_hours", 48)

    confirm_url = f"{APP_BASE_URL}/api/referral/confirm?token={confirmation_token}"
    decline_url = f"{APP_BASE_URL}/api/referral/decline?token={confirmation_token}"

    patient_name = patient.get("name", "N/A")
    patient_email = patient.get("email", "N/A")
    patient_phone = patient.get("phone", "N/A")
    preferred_date = patient.get("preferred_date", "N/A")
    preferred_time = patient.get("preferred_time", "N/A")
    patient_notes = patient.get("notes", "None provided")

    score = assessment.get("score", "N/A")
    tier = assessment.get("tier", "N/A")

    subject = "[PHQ-9 Reflect] New Patient Referral — Action Required"

    body = f"""Dear {clinic_name},

A new patient referral has been submitted through PHQ-9 Reflect.
Please review the details below and confirm or decline within {response_hours} hours.

Referral ID: {referral_id}

--- PATIENT DETAILS ---
Name:            {patient_name}
Email:           {patient_email}
Phone:           {patient_phone}
Preferred date:  {preferred_date}
Preferred time:  {preferred_time}
Notes:           {patient_notes}

--- ASSESSMENT SUMMARY ---
PHQ-9 Score:     {score}
Severity Tier:   {tier}

--- ACTION REQUIRED ---
To CONFIRM this referral, visit:
{confirm_url}

To DECLINE this referral, visit:
{decline_url}

If no response is received within {response_hours} hours, this referral
will be automatically reassigned to the next available clinic.

---
This referral was sent by PHQ-9 Reflect. Do not reply to this email.
"""

    logger.info(
        f"Sending referral email | referral_id={referral_id} "
        f"| clinic={clinic_name} | patient_name={patient_name}"
    )
    return await _send_email(clinic_email, subject, body)


async def send_confirmation_to_patient(
    patient_email: str,
    patient_name: str,
    clinic_name: str,
    preferred_date: str,
    preferred_time: str,
) -> bool:
    """
    Sends a booking confirmation email to the patient after the clinic confirms.

    Args:
        patient_email: Patient's email address.
        patient_name: Patient's display name.
        clinic_name: Name of the clinic that confirmed.
        preferred_date: The appointment date the patient requested.
        preferred_time: The appointment time the patient requested.

    Returns:
        True if sent successfully, False on SMTP error.
    """
    subject = "Your appointment request has been confirmed"

    body = f"""Hi {patient_name},

Good news — your appointment request has been confirmed.

Clinic:          {clinic_name}
Requested date:  {preferred_date}
Requested time:  {preferred_time}

The clinic will follow up with you directly to finalize scheduling
details and share any preparation instructions.

Reaching out is a meaningful step. We're glad you took it.

---
This email was sent by PHQ-9 Reflect. Do not reply to this email.
"""

    logger.info(
        f"Sending confirmation to patient | email={patient_email} "
        f"| clinic={clinic_name}"
    )
    return await _send_email(patient_email, subject, body)


async def send_reassignment_notice_to_patient(
    patient_email: str,
    patient_name: str,
) -> bool:
    """
    Sent to the patient when their first-choice clinic declined
    (or did not respond in time) and the system is trying the next clinic.

    Args:
        patient_email: Patient's email address.
        patient_name: Patient's display name.

    Returns:
        True if sent successfully, False on SMTP error.
    """
    subject = "Update on your appointment request"

    body = f"""Hi {patient_name},

We're finding the best available clinic for you.
No action is needed on your end — we'll confirm once an appointment
is arranged.

Thank you for your patience. We want to make sure you're connected
with the right support.

---
This email was sent by PHQ-9 Reflect. Do not reply to this email.
"""

    logger.info(f"Sending reassignment notice to patient | email={patient_email}")
    return await _send_email(patient_email, subject, body)


async def send_final_decline_to_patient(
    patient_email: str,
    patient_name: str,
) -> bool:
    """
    Sends a final failure notice to the patient when no clinics could confirm.

    Args:
        patient_email: Patient's email address.
        patient_name: Patient's display name.

    Returns:
        True if sent successfully, False on SMTP error.
    """
    subject = "Update on your appointment request"

    body = f"""Hi {patient_name},

We were unable to arrange an appointment at this time.
Please contact us directly for assistance.

---
This email was sent by PHQ-9 Reflect. Do not reply to this email.
"""

    logger.info(f"Sending final decline notice to patient | email={patient_email}")
    return await _send_email(patient_email, subject, body)

