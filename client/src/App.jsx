import { useState } from "react";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/create-checkout-session`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not start checkout.");
      }
      if (!result.url) {
        throw new Error("The server did not return a Stripe Checkout URL.");
      }

      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError.message || "Unable to reach the checkout server.");
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

          <button className="checkout-button" type="button" onClick={startCheckout} disabled={isLoading}>
            {isLoading ? "Connecting to Stripe…" : "Continue to secure checkout"}
            {!isLoading && <span aria-hidden="true">→</span>}
          </button>
          <p className="payment-note">Demo purchase · Test mode only · No card details stored here</p>

          {error && <p className="notice error" role="alert">{error}</p>}
          {checkoutStatus === "success" && (
            <p className="notice success" role="status">
              You returned from checkout. This demo does not verify or fulfill the payment.
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
