# email_templates.py
# ─────────────────────────────────────────────────────────
# All email templates for the MAEDOT referral system.
# Written in plain text — readable in any email client.
# ─────────────────────────────────────────────────────────


def clinic_assignment_email(referral: dict, confirm_url: str, decline_url: str) -> dict:
    """
    Email sent to clinic when a new referral is assigned.
    confirm_url and decline_url are simple GET endpoints the clinic clicks.
    """
    return {
        "subject": f"New Patient Referral — MAEDOT Wellness Platform",
        "body": f"""Dear Partner Clinic,

A new patient referral has been submitted through MAEDOT, our psychoeducational wellness platform. The patient has completed a validated PHQ-9 self-assessment and has requested professional support.

─── REFERRAL DETAILS ───────────────────────────────

Name:                {referral['full_name']}
Preferred contact:   {referral.get('contact_email') or referral.get('contact_phone', 'See notes')}
Location:            {referral['city_region']}
Appointment type:    {referral['appointment_type'].title()}
Availability:        {referral['availability']}
Specific concerns:   {referral.get('specific_concerns') or 'None provided'}
Assessment tier:     {referral['assessment_tier'].title()} range

────────────────────────────────────────────────────

Please confirm or decline this referral within 48 hours:

✓ CONFIRM this referral:
{confirm_url}

✗ DECLINE this referral:
{decline_url}

If you confirm, please reach out to the patient directly using their preferred contact above. Once confirmed, MAEDOT will notify the patient that a clinic has been assigned.

If we do not hear from you within 48 hours, we will reassign to another partner clinic.

Thank you for your partnership.

— The MAEDOT Team
maedot.app | Psychoeducational Wellness Platform

───
This referral was generated after the patient voluntarily completed a PHQ-9 self-assessment and consented to being contacted by a mental health professional. Raw assessment answers are not shared. Score tier is included only to assist appropriate matching.
"""
    }


def patient_confirmation_email(referral: dict) -> dict:
    """
    Email sent to patient when their referral is confirmed by a clinic.
    """
    return {
        "subject": "Your appointment request has been received — MAEDOT",
        "body": f"""Hi {referral['full_name']},

Thank you for taking the step to request professional support. That takes courage.

A partner clinic has accepted your referral and will be reaching out to you shortly using your preferred contact method. Please expect to hear from them within 1–3 business days.

What happens next:
- The clinic will contact you to schedule your first appointment
- You can continue using MAEDOT for your regular check-ins
- Your referral details are kept private — only the clinic assigned to you has access

If you have any questions or concerns, reply to this email and our team will help.

Take care of yourself.

— The MAEDOT Team
maedot.app

───
If you did not submit this referral request, please reply to this email immediately.
"""
    }


def patient_submission_confirmation_email(referral: dict) -> dict:
    """
    Email sent to patient immediately after they submit the form,
    before any clinic has been assigned. Confirms we received it.
    """
    return {
        "subject": "We received your appointment request — MAEDOT",
        "body": f"""Hi {referral['full_name']},

We have received your appointment request. Our team will review it and assign you to an appropriate partner clinic within 24–48 hours.

You will receive another email once a clinic has confirmed your referral.

Your request summary:
- Location: {referral['city_region']}
- Appointment type: {referral['appointment_type'].title()}
- Availability: {referral['availability']}

In the meantime, continue checking in with MAEDOT as usual. Your reflection history is always available in your dashboard.

— The MAEDOT Team
maedot.app
"""
    }


def admin_new_referral_email(referral: dict, referral_id: str) -> dict:
    """
    Internal notification to MAEDOT admin team when a new referral is submitted.
    """
    return {
        "subject": f"[MAEDOT] New referral submitted — {referral['full_name']}",
        "body": f"""New referral submission received.

Referral ID: {referral_id}
Name:         {referral['full_name']}
Contact:      {referral.get('contact_email') or referral.get('contact_phone', 'Not provided')}
Location:     {referral['city_region']}
Type:         {referral['appointment_type']}
Availability: {referral['availability']}
Concerns:     {referral.get('specific_concerns') or 'None'}
Tier:         {referral['assessment_tier']}
Score:        {referral['assessment_score']}
Submitted:    {referral['submitted_at']}

Status: PENDING — clinic assignment email sent automatically.

Log into Supabase to monitor assignment status.
"""
    }