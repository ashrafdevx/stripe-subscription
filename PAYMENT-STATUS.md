# Payment status quick guide

| Stripe event | Status recorded | What the app does |
| --- | --- | --- |
| `payment_intent.created` | `pending` | Adds a payment log; no purchase is created. |
| `payment_intent.processing` | `processing` | Adds a payment log; no purchase is created. |
| `payment_intent.payment_failed` | `failed` | Adds a payment log; no purchase is created. |
| `payment_intent.canceled` | `canceled` | Adds a payment log; no purchase is created. |
| `payment_intent.succeeded` | `succeeded` | Adds a payment log and creates or updates the purchase. |

## Other payment details

- `requires_action` is handled during frontend `stripe.confirmPayment()` (including authentication such as 3D Secure). It is not currently mapped to a webhook log status; if it is returned to the UI, the current code shows the generic incomplete-payment message.
- `card` is a payment method type, not a PaymentIntent status. The app lets Stripe use Dashboard-enabled payment methods and does not currently save the method type in MongoDB.

Webhook signatures are verified before events are processed. Duplicate Stripe event IDs are not logged twice.
