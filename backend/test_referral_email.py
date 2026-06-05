import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock aiosmtplib before importing referral_email
sys.modules['aiosmtplib'] = MagicMock()

import referral_email
from referral_email import (
    send_referral_to_clinic,
    send_confirmation_to_patient,
    send_reassignment_notice_to_patient
)

class TestReferralEmail(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Override module-level settings for testing
        self.original_smtp_user = referral_email.SMTP_USER
        self.original_smtp_password = referral_email.SMTP_PASSWORD
        self.original_email_from = referral_email.EMAIL_FROM
        self.original_app_base_url = referral_email.APP_BASE_URL

        referral_email.SMTP_USER = "test_user"
        referral_email.SMTP_PASSWORD = "test_password"
        referral_email.EMAIL_FROM = "test@test.com"
        referral_email.APP_BASE_URL = "http://localhost:3000"

    def tearDown(self):
        # Restore module-level settings
        referral_email.SMTP_USER = self.original_smtp_user
        referral_email.SMTP_PASSWORD = self.original_smtp_password
        referral_email.EMAIL_FROM = self.original_email_from
        referral_email.APP_BASE_URL = self.original_app_base_url

    @patch("aiosmtplib.send", new_callable=AsyncMock)
    async def test_send_referral_to_clinic_success(self, mock_send):
        mock_send.return_value = (None, None)
        
        clinic = {
            "name": "Hope Wellness",
            "email": "hope@wellness.com",
            "response_window_hours": 24
        }
        patient = {
            "name": "John Doe",
            "email": "john@doe.com",
            "phone": "555-0199",
            "preferred_date": "2026-06-15",
            "preferred_time": "10:00 AM",
            "notes": "Struggling with sleep"
        }
        assessment = {
            "score": 14,
            "tier": "Elevated"
        }
        
        result = await send_referral_to_clinic(
            referral_id="ref_999",
            confirmation_token="tok_secret_123",
            clinic=clinic,
            patient=patient,
            assessment=assessment
        )
        
        self.assertTrue(result)
        mock_send.assert_called_once()
        
        # Inspect arguments sent to aiosmtplib.send
        args, kwargs = mock_send.call_args
        msg = args[0]
        self.assertEqual(msg["To"], "hope@wellness.com")
        self.assertEqual(msg["From"], "test@test.com")
        self.assertEqual(msg["Subject"], "[PHQ-9 Reflect] New Patient Referral — Action Required")
        
        body = msg.get_content()
        self.assertIn("John Doe", body)
        self.assertIn("555-0199", body)
        self.assertIn("14", body)
        self.assertIn("Elevated", body)
        self.assertIn("http://localhost:3000/api/referral/confirm?token=tok_secret_123", body)
        self.assertIn("http://localhost:3000/api/referral/decline?token=tok_secret_123", body)
        self.assertIn("24 hours", body)
        self.assertIn("Do not reply to this email.", body)

    @patch("aiosmtplib.send", new_callable=AsyncMock)
    async def test_send_referral_to_clinic_smtp_error(self, mock_send):
        mock_send.side_effect = Exception("SMTP Connection Timeout")
        
        clinic = {"name": "Hope Wellness", "email": "hope@wellness.com", "response_window_hours": 24}
        patient = {"name": "John Doe", "email": "john@doe.com"}
        assessment = {"score": 14, "tier": "Elevated"}
        
        result = await send_referral_to_clinic(
            referral_id="ref_999",
            confirmation_token="tok_secret_123",
            clinic=clinic,
            patient=patient,
            assessment=assessment
        )
        
        self.assertFalse(result)
        mock_send.assert_called_once()

    @patch("aiosmtplib.send", new_callable=AsyncMock)
    async def test_send_confirmation_to_patient(self, mock_send):
        mock_send.return_value = (None, None)
        
        result = await send_confirmation_to_patient(
            patient_email="john@doe.com",
            patient_name="John Doe",
            clinic_name="Hope Wellness",
            preferred_date="2026-06-15",
            preferred_time="10:00 AM"
        )
        
        self.assertTrue(result)
        mock_send.assert_called_once()
        
        args, kwargs = mock_send.call_args
        msg = args[0]
        self.assertEqual(msg["To"], "john@doe.com")
        self.assertEqual(msg["Subject"], "Your appointment request has been confirmed")
        
        body = msg.get_content()
        self.assertIn("Hope Wellness", body)
        self.assertIn("2026-06-15", body)
        self.assertIn("10:00 AM", body)
        self.assertIn("Reaching out is a meaningful step.", body)

    @patch("aiosmtplib.send", new_callable=AsyncMock)
    async def test_send_reassignment_notice_to_patient(self, mock_send):
        mock_send.return_value = (None, None)
        
        result = await send_reassignment_notice_to_patient(
            patient_email="john@doe.com",
            patient_name="John Doe"
        )
        
        self.assertTrue(result)
        mock_send.assert_called_once()
        
        args, kwargs = mock_send.call_args
        msg = args[0]
        self.assertEqual(msg["To"], "john@doe.com")
        self.assertEqual(msg["Subject"], "Update on your appointment request")
        
        body = msg.get_content()
        self.assertIn("We're finding the best available clinic for you.", body)

    async def test_smtp_not_configured(self):
        # Temporarily clear SMTP settings
        referral_email.SMTP_USER = ""
        
        clinic = {"name": "Hope Wellness", "email": "hope@wellness.com", "response_window_hours": 24}
        patient = {"name": "John Doe", "email": "john@doe.com"}
        assessment = {"score": 14, "tier": "Elevated"}
        
        result = await send_referral_to_clinic(
            referral_id="ref_999",
            confirmation_token="tok_secret_123",
            clinic=clinic,
            patient=patient,
            assessment=assessment
        )
        self.assertFalse(result)

if __name__ == "__main__":
    unittest.main()
