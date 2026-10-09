import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");
const paymentReturned = new URLSearchParams(window.location.search).get("payment") === "complete";

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submitPayment(event) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

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
console.log("confirmPayment result:", result);
console.log("confirmPayment .paymentIntent?.status:", result.paymentIntent?.status);
console.log("confirmPayment result.paymentIntent?.status:", result.paymentIntent?.status);

      if (result.error) {
        setError(result.error.message || "The payment could not be confirmed.");
      } else if (result.paymentIntent?.status === "succeeded") {
        setStatus("Payment succeeded in Stripe. This demo does not record orders or verify fulfillment.");
      } else if (result.paymentIntent?.status === "processing") {
        setStatus("Payment is processing. Check Stripe Dashboard for its final status.");
      } else {
        setError("Payment was not completed. Check the payment details and try again.");
      }
    } catch (paymentError) {
      setError(paymentError.message || "Unable to confirm the payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form className="payment-form" onSubmit={submitPayment}>
      <PaymentElement />
      <button className="checkout-button" type="submit" disabled={!stripe || !elements || isProcessing}>
        {isProcessing ? "Processing payment…" : "Pay $10.00"}
        {!isProcessing && <span aria-hidden="true">→</span>}
      </button>
      {error && <p className="notice error" role="alert">{error}</p>}
      {status && <p className="notice success" role="status">{status}</p>}
      <p className="payment-note">Your payment details are securely handled by Stripe.</p>
    </form>
  );
}

function App() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("payment_intent_client_secret")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function startPayment() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/create-payment-intent`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not start the payment.");
      }
      if (typeof result.clientSecret !== "string" || !result.clientSecret.startsWith("pi_")) {
        throw new Error("The server did not return a valid PaymentIntent client secret.");
      }

      setClientSecret(result.clientSecret);
    } catch (paymentError) {
      setError(paymentError.message || "Unable to reach the payment server.");
    } finally {
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
              <PaymentForm />
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
              Returned from Stripe. Check Stripe Dashboard to confirm payment; this demo does not verify or fulfill orders.
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
