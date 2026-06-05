import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import stripe

from main import app
from auth import get_current_user
from routers.stripe_router import STRIPE_WEBHOOK_SECRET

client = TestClient(app)

# Dummy user for dependency override
mock_user = {
    "id": "test-user-uuid",
    "email": "test@example.com",
    "name": "Test User",
    "stripe_customer_id": "cus_test123",
    "tier": "free",
    "subscription_id": None,
    "trial_ends_at": None
}

class TestStripeRouter(unittest.TestCase):

    def setUp(self):
        # Override the auth dependency before each test
        app.dependency_overrides[get_current_user] = lambda: mock_user

    def tearDown(self):
        # Clear dependency overrides after each test
        app.dependency_overrides.pop(get_current_user, None)

    @patch("routers.stripe_router.stripe.checkout.Session.create")
    def test_create_checkout_existing_customer(self, mock_session_create):
        # Mocking stripe checkout session response
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"
        mock_session_create.return_value = mock_session

        response = client.post(
            "/api/stripe/create-checkout",
            json={
                "price_id": "price_123",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"checkout_url": "https://checkout.stripe.com/pay/cs_test_abc"})
        mock_session_create.assert_called_once_with(
            customer="cus_test123",
            payment_method_types=['card'],
            line_items=[{"price": "price_123", "quantity": 1}],
            mode='subscription',
            subscription_data={"trial_period_days": 14},
            success_url="https://example.com/success",
            cancel_url="https://example.com/cancel",
            allow_promotion_codes=True,
        )

    @patch("routers.stripe_router.stripe.Customer.create")
    @patch("routers.stripe_router.stripe.checkout.Session.create")
    @patch("routers.stripe_router.get_supabase")
    def test_create_checkout_new_customer(self, mock_get_supabase, mock_session_create, mock_customer_create):
        # Modify mock user to not have stripe_customer_id
        temp_user = mock_user.copy()
        temp_user["stripe_customer_id"] = None
        app.dependency_overrides[get_current_user] = lambda: temp_user

        # Mock customer creation
        mock_cust = MagicMock()
        mock_cust.id = "cus_new_123"
        mock_customer_create.return_value = mock_cust

        # Mock DB update
        mock_db = MagicMock()
        mock_get_supabase.return_value = mock_db
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        # Mock checkout session
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/pay/cs_test_new"
        mock_session_create.return_value = mock_session

        response = client.post(
            "/api/stripe/create-checkout",
            json={
                "price_id": "price_123",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"checkout_url": "https://checkout.stripe.com/pay/cs_test_new"})
        mock_customer_create.assert_called_once_with(email="test@example.com", name="Test User")
        mock_db.table.assert_called_once_with("users")
        mock_db.table().update.assert_called_once_with({"stripe_customer_id": "cus_new_123"})

    def test_webhook_missing_signature(self):
        # Send webhook with missing signature header
        response = client.post("/api/stripe/webhook", content=b"payload")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Missing stripe-signature header")

    @patch("routers.stripe_router.stripe.Webhook.construct_event")
    def test_webhook_invalid_signature(self, mock_construct):
        mock_construct.side_effect = stripe.error.SignatureVerificationError("Invalid sig", "sig")
        response = client.post("/api/stripe/webhook", content=b"payload", headers={"stripe-signature": "invalid"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Invalid signature")

    @patch("routers.stripe_router.stripe.Webhook.construct_event")
    @patch("routers.stripe_router.get_supabase")
    def test_webhook_checkout_session_completed(self, mock_get_supabase, mock_construct):
        # Mock verified stripe event
        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer": "cus_test123",
                    "subscription": "sub_test123"
                }
            }
        }
        mock_construct.return_value = event

        # Mock DB query & update
        mock_db = MagicMock()
        mock_get_supabase.return_value = mock_db
        
        # Query returns existing user
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-user-uuid"}]
        )

        response = client.post("/api/stripe/webhook", json=event, headers={"stripe-signature": "valid_sig"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success"})
        
        # Verify DB calls
        mock_db.table.assert_any_call("users")
        # Verify update calls
        mock_db.table().update.assert_called_once()
        args, kwargs = mock_db.table().update.call_args
        updated_fields = args[0]
        self.assertEqual(updated_fields["tier"], "premium")
        self.assertEqual(updated_fields["subscription_id"], "sub_test123")
        self.assertIn("trial_ends_at", updated_fields)

    @patch("routers.stripe_router.stripe.Webhook.construct_event")
    @patch("routers.stripe_router.get_supabase")
    def test_webhook_subscription_deleted(self, mock_get_supabase, mock_construct):
        event = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "customer": "cus_test123"
                }
            }
        }
        mock_construct.return_value = event

        mock_db = MagicMock()
        mock_get_supabase.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-user-uuid"}]
        )

        response = client.post("/api/stripe/webhook", json=event, headers={"stripe-signature": "valid_sig"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success"})

        mock_db.table().update.assert_called_once_with({
            "tier": "free",
            "subscription_id": None
        })

    @patch("routers.stripe_router.stripe.Webhook.construct_event")
    @patch("routers.stripe_router.get_supabase")
    def test_webhook_subscription_updated_active(self, mock_get_supabase, mock_construct):
        event = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "active"
                }
            }
        }
        mock_construct.return_value = event

        mock_db = MagicMock()
        mock_get_supabase.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-user-uuid"}]
        )

        response = client.post("/api/stripe/webhook", json=event, headers={"stripe-signature": "valid_sig"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success"})

        mock_db.table().update.assert_called_once_with({
            "tier": "premium",
            "subscription_id": "sub_test123"
        })

    @patch("routers.stripe_router.stripe.Webhook.construct_event")
    @patch("routers.stripe_router.get_supabase")
    def test_webhook_subscription_updated_past_due(self, mock_get_supabase, mock_construct):
        event = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "past_due"
                }
            }
        }
        mock_construct.return_value = event

        mock_db = MagicMock()
        mock_get_supabase.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-user-uuid"}]
        )

        response = client.post("/api/stripe/webhook", json=event, headers={"stripe-signature": "valid_sig"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success"})

        mock_db.table().update.assert_called_once_with({
            "tier": "free",
            "subscription_id": "sub_test123"
        })

    def test_subscription_status(self):
        response = client.get("/api/stripe/subscription-status")
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertEqual(res_data["tier"], "free")
        self.assertIsNone(res_data["subscription_id"])
        self.assertFalse(res_data["is_trial"])

    @patch("routers.stripe_router.stripe.Subscription.modify")
    def test_cancel_subscription_success(self, mock_sub_modify):
        # Override user to have a subscription_id
        temp_user = mock_user.copy()
        temp_user["subscription_id"] = "sub_active_123"
        app.dependency_overrides[get_current_user] = lambda: temp_user

        response = client.post("/api/stripe/cancel")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "Your subscription will end at the current billing period."})
        mock_sub_modify.assert_called_once_with("sub_active_123", cancel_at_period_end=True)

    def test_cancel_subscription_missing_id(self):
        # Mock user has subscription_id = None
        response = client.post("/api/stripe/cancel")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "No active subscription found.")

    def test_require_premium_success(self):
        import asyncio
        from auth import require_premium
        user = {"tier": "premium"}
        result = asyncio.run(require_premium(current_user=user))
        self.assertEqual(result, user)

    def test_require_premium_raises_403(self):
        import asyncio
        from auth import require_premium
        from fastapi import HTTPException
        user = {"tier": "free"}
        with self.assertRaises(HTTPException) as context:
            asyncio.run(require_premium(current_user=user))
        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail["code"], "PREMIUM_REQUIRED")


if __name__ == "__main__":
    unittest.main()
