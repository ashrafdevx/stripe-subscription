import { useEffect, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://stripe-subscription-muw7.onrender.com'
    : 'http://localhost:3000')
).replace(/\/+$/, '');
const publishableKey = import.meta.env.STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");
const paymentReturned = new URLSearchParams(window.location.search).get("payment") === "complete";

function PaymentForm({ onStartNewPayment }) {
  const stripe = useStripe();
  const elements = useElements();
  const submissionInProgress = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submitPayment(event) {
    event.preventDefault();

    if (!stripe || !elements || submissionInProgress.current || isFinished) {
      return;
    }

    submissionInProgress.current = true;
    setIsProcessing(true);
    setError("");
    setStatus("");

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?payment=complete`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "The payment could not be confirmed.");
        setIsFinished(true);
      } else if (result.paymentIntent?.status === "succeeded") {
        setStatus("Payment succeeded in Stripe. Your purchase record is updated when the verified webhook arrives.");
        setIsFinished(true);
      } else if (result.paymentIntent?.status === "processing") {
        setStatus("Payment is processing. Check Stripe Dashboard for its final status.");
        setIsFinished(true);
      } else {
        setError("Payment was not completed. Check the payment details and try again.");
        setIsFinished(true);
      }
    } catch (paymentError) {
      setError(paymentError.message || "Unable to confirm the payment. Please try again.");
      setIsFinished(true);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <form className="payment-form" onSubmit={submitPayment}>
        <PaymentElement />
        <button className="checkout-button" type="submit" disabled={!stripe || !elements || isProcessing || isFinished}>
          {isProcessing ? "Processing payment…" : "Pay $10.00"}
          {!isProcessing && <span aria-hidden="true">→</span>}
        </button>
        {error && <p className="notice error" role="alert">{error}</p>}
        {status && <p className="notice success" role="status">{status}</p>}
        <p className="payment-note">Your payment details are securely handled by Stripe.</p>
      </form>
      {isFinished && resultAllowsAnotherAttempt(status) && (
        <button className="checkout-button" type="button" onClick={onStartNewPayment}>
          Start another $10.00 payment
          <span aria-hidden="true">→</span>
        </button>
      )}
      {isFinished && error && (
        <button className="checkout-button" type="button" onClick={onStartNewPayment}>
          Try again with a new payment
          <span aria-hidden="true">→</span>
        </button>
      )}
    </>
  );
}

function resultAllowsAnotherAttempt(status) {
  return status.startsWith("Payment succeeded");
}

function App() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const paymentRequestInProgress = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("payment_intent_client_secret")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  
async function startPayment() {
  if (paymentRequestInProgress.current) {
    return;
  }

  paymentRequestInProgress.current = true;
  setIsLoading(true);
  setError("");
  setClientSecret("");

  try {
    const response = await fetch(
      `${API_URL}/create-payment-intent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not start the payment."
      );
    }

    if (
      typeof result.clientSecret !== "string" ||
      !/^pi_[^_]+_secret_[^_]+$/.test(result.clientSecret)
    ) {
      throw new Error(
        "The server did not return a valid PaymentIntent client secret."
      );
    }

    setClientSecret(result.clientSecret);
  } catch (paymentError) {
    console.error("Payment initialization failed:", paymentError);

    setError(
      paymentError.message || "Unable to reach the payment server."
    );
  } finally {
    paymentRequestInProgress.current = false;
    setIsLoading(false);
  }
}


  return (
    <main className="store">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Simple Store home">
          <span className="brand-mark">S</span>
          <span>simple store</span>
        </a>
        <span className="secure-label">
          <span aria-hidden="true">●</span> Secure checkout
        </span>
      </header>

      <section className="product-layout" aria-labelledby="product-title">
        <div className="product-art" aria-label="Abstract illustration of a blue ceramic cup" role="img">
          <div className="sun" />
          <div className="cup">
            <div className="cup-handle" />
            <div className="cup-body" />
            <div className="cup-shadow" />
          </div>
          <span className="art-caption">made for slow mornings</span>
        </div>

        <div className="product-info">
          <p className="eyebrow">THE EVERYDAY COLLECTION</p>
          <h1 id="product-title">The Sunday<br />Ceramic Cup</h1>
          <p className="description">
            A small-batch stoneware cup for your daily ritual. Hand-finished,
            easy to hold, and made to be used every day.
          </p>

          <div className="product-meta">
            <span>Handmade stoneware</span>
            <span>12 oz · Sea blue</span>
          </div>

          <div className="price-row">
            <span className="price">$10.00</span>
            <span className="price-note">One-time payment</span>
          </div>

          {!publishableKey && (
            <p className="notice error" role="alert">
              Stripe is not configured. Set STRIPE_PUBLISHABLE_KEY in the workspace .env.local file and restart the client.
            </p>
          )}

          {clientSecret && stripePromise ? (
            <Elements
              key={clientSecret}
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#294f59", borderRadius: "3px" },
                },
              }}
            >
              <PaymentForm onStartNewPayment={startPayment} />
            </Elements>
          ) : (
            <>
              <button
                className="checkout-button"
                type="button"
                onClick={startPayment}
                disabled={isLoading || !stripePromise}
              >
                {isLoading ? "Preparing secure payment…" : "Continue to secure payment"}
                {!isLoading && <span aria-hidden="true">→</span>}
              </button>
              <p className="payment-note">Demo purchase · Test mode only</p>
            </>
          )}

          {error && <p className="notice error" role="alert">{error}</p>}
          {paymentReturned && (
            <p className="notice success" role="status">
              Returned from Stripe. The backend records payment status after it receives and verifies Stripe's webhook.
            </p>
          )}
          {checkoutStatus === "success" && (
            <p className="notice success" role="status">
              You returned from hosted Checkout. Check Stripe Dashboard to confirm payment.
            </p>
          )}
          {checkoutStatus === "cancel" && (
            <p className="notice" role="status">Checkout was canceled. Your card was not charged.</p>
          )}
        </div>
      </section>

      <footer className="footer">
        <span>Thoughtfully made. Simply paid.</span>
        <span>Payments securely handled by Stripe</span>
      </footer>
    </main>
  );
}

export default App;
