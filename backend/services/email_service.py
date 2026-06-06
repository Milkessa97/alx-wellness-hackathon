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


# ── Mood metadata ────────────────────────────────────────────────────────
MOODS = [
    {"key": "happy",   "emoji": "😊", "color": "#16A34A"},
    {"key": "calm",    "emoji": "😌", "color": "#7C9A7E"},
    {"key": "tired",   "emoji": "😴", "color": "#6366F1"},
    {"key": "anxious", "emoji": "😰", "color": "#D97706"},
    {"key": "sad",     "emoji": "😢", "color": "#2563EB"},
    {"key": "angry",   "emoji": "😠", "color": "#DC2626"},
]


def _build_action_items_html(action_items: list) -> str:
    """Build a numbered list of action items for the email body."""
    rows = ""
    for i, item in enumerate(action_items, start=1):
        text = item.get("text", "")
        rows += (
            f'<tr><td style="padding:4px 0;color:#3D3D3D;font-size:15px;line-height:1.6;">'
            f'{i}. {text}</td></tr>'
        )
    return rows


def _build_mood_buttons_html(token: str) -> str:
    """Build six side-by-side mood anchor buttons."""
    cells = ""
    for mood in MOODS:
        href = f"{APP_BASE_URL}/mood?token={token}&mood={mood['key']}"
        cells += (
            f'<td align="center" style="padding:4px 6px;">'
            f'<a href="{href}" target="_blank" '
            f'style="display:inline-block;min-width:64px;padding:10px 6px;'
            f'background-color:{mood["color"]};color:#FFFFFF;'
            f'text-decoration:none;border-radius:10px;font-size:14px;'
            f'font-weight:600;text-align:center;">'
            f'{mood["emoji"]}<br/>{mood["key"].capitalize()}'
            f'</a></td>'
        )
    return cells


def _build_html(user: dict, action_items: list, token: str) -> str:
    """Compose the full HTML email body."""
    first_name = user.get("name", "there").split()[0]
    action_rows = _build_action_items_html(action_items)
    mood_cells = _build_mood_buttons_html(token)

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#FAF8F3;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#FAF8F3;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
           style="max-width:600px;width:100%;background-color:#FFFFFF;
                  border-radius:12px;overflow:hidden;
                  border:1px solid #E8E4DC;">

      <!-- Header -->
      <tr>
        <td style="background-color:#4A6B4C;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:0.3px;">
            🌿 MAEDOT
          </h1>
          <p style="margin:6px 0 0;color:#D4E7D6;font-size:13px;">
            Your daily wellness check-in
          </p>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding:28px 32px 8px;">
          <p style="margin:0;color:#3D3D3D;font-size:16px;line-height:1.5;">
            Hi {first_name} 👋
          </p>
          <p style="margin:8px 0 0;color:#6B6B6B;font-size:14px;line-height:1.5;">
            Here's your personalised wellness plan for today.
          </p>
        </td>
      </tr>

      <!-- Section 1 — Action Plan -->
      <tr>
        <td style="padding:20px 32px 4px;">
          <h2 style="margin:0 0 12px;color:#4A6B4C;font-size:18px;font-weight:700;">
            ✦ Today's Wellness Actions
          </h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            {action_rows}
          </table>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:16px 32px;">
          <hr style="border:none;border-top:1px solid #E8E4DC;margin:0;">
        </td>
      </tr>

      <!-- Section 2 — Mood -->
      <tr>
        <td style="padding:4px 32px 8px;">
          <h2 style="margin:0 0 12px;color:#D97706;font-size:18px;font-weight:700;">
            ◉ How are you feeling today?
          </h2>
          <p style="margin:0 0 16px;color:#6B6B6B;font-size:13px;">
            Tap the emoji that best describes your mood right now.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"
                 style="margin:0 auto;">
            <tr>
              {mood_cells}
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 32px;text-align:center;background-color:#F5F2EB;">
          <p style="margin:0;color:#9B9B9B;font-size:11px;line-height:1.6;">
            You're receiving this because you're a MAEDOT Premium member.<br/>
            Take care of yourself — one small step at a time. 💚
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""
    return html


async def send_daily_wellness_email(
    user: dict, action_items: list, token: str
) -> None:
    """
    Send the daily wellness check-in email to a single user.

    Args:
        user: Dict with at least 'name' and 'email' keys.
        action_items: List of dicts, each with a 'text' key.
        token: The email_mood_tokens.token value for one-click mood logging.

    Raises:
        Exception: Propagates SMTP errors so the caller can handle per-user failures.
    """
    first_name = user.get("name", "there").split()[0]
    subject = f"Your MAEDOT Daily Check-In 🌿 {first_name}"

    html_body = _build_html(user, action_items, token)

    msg = EmailMessage()
    msg["From"] = EMAIL_FROM
    msg["To"] = user["email"]
    msg["Subject"] = subject
    msg.set_content(
        f"Hi {first_name}, your daily wellness actions are ready. "
        "Open this email in an HTML-capable client to see your plan."
    )
    msg.add_alternative(html_body, subtype="html")

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        start_tls=True,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
    )

    logger.info(f"Daily wellness email sent to {user['email']}")
