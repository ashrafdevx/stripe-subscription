import { useEffect, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import AuthPanel from "./components/AuthPanel";
import { apiRequest, refreshSession, setAccessToken } from "./api";

const publishableKey = import.meta.env.STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const checkoutStatus = new URLSearchParams(window.location.search).get("checkout");
const paymentReturned = new URLSearchParams(window.location.search).get("payment") === "complete";

function formatPrice(product) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: product.currency.toUpperCase(),
  }).format(product.amount / 100);
}

function PaymentForm({ product, onStartNewPayment, onChooseAnother }) {
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
      <button className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#a8c5b7]" type="button" onClick={onChooseAnother}>
        ← Choose another product
      </button>
      <form className="mt-[18px] grid gap-3.5" onSubmit={submitPayment}>
        <PaymentElement />
        <button className="mt-0 flex min-h-[54px] w-full items-center justify-between rounded-md border-0 bg-accent px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgb(49_91_80_/_12%)] transition hover:-translate-y-px hover:bg-accent-hover hover:shadow-[0_8px_17px_rgb(49_91_80_/_18%)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={!stripe || !elements || isProcessing || isFinished}>
          {isProcessing ? "Processing payment…" : `Pay ${formatPrice(product)}`}
          {!isProcessing && <span aria-hidden="true">→</span>}
        </button>
        {error && <p className="mt-3.5 rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">{error}</p>}
        {status && <p className="mt-3.5 rounded-md border border-[#d7e8dc] bg-[#eaf3ed] px-3 py-[11px] text-xs leading-5 text-[#37634a]" role="status">{status}</p>}
        <p className="mt-3 text-center text-[10px] text-muted">Your payment details are securely handled by Stripe.</p>
      </form>
      {isFinished && resultAllowsAnotherAttempt(status) && (
        <button className="mt-4 flex min-h-[54px] w-full items-center justify-between rounded-md border-0 bg-accent px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgb(49_91_80_/_12%)] transition hover:bg-accent-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)]" type="button" onClick={onStartNewPayment}>
          Start another {formatPrice(product)} payment
          <span aria-hidden="true">→</span>
        </button>
      )}
      {isFinished && error && (
        <button className="mt-4 flex min-h-[54px] w-full items-center justify-between rounded-md border-0 bg-accent px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgb(49_91_80_/_12%)] transition hover:bg-accent-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)]" type="button" onClick={onStartNewPayment}>
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
  const [activeTab, setActiveTab] = useState('all');
  const [demoProducts, setDemoProducts] = useState([]);
  const [stripeProducts, setStripeProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [stripeCatalogError, setStripeCatalogError] = useState('');
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const paymentRequestInProgress = useRef(false);
  const visibleProducts = activeTab === 'all' ? demoProducts : stripeProducts;

  useEffect(() => {
    let isCurrent = true;

    function handleSessionExpired() {
      setAccessToken(null);
      setUser(null);
      setClientSecret('');
    }

    window.addEventListener('auth:expired', handleSessionExpired);

    refreshSession()
      .then((session) => {
        if (isCurrent && session) {
          setUser(session.user);
        }
      })
      .catch((sessionError) => {
        console.error("Session restoration failed:", sessionError);
      })
      .finally(() => {
        if (isCurrent) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      isCurrent = false;
      window.removeEventListener('auth:expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("payment_intent_client_secret")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    async function loadCatalog() {
      try {
        const [demoResponse, stripeResponse] = await Promise.all([
          apiRequest('/products/demo'),
          apiRequest('/products'),
        ]);
        const [demoResult, stripeResult] = await Promise.all([
          demoResponse.json(),
          stripeResponse.json(),
        ]);

        if (!demoResponse.ok) {
          throw new Error(demoResult.error || 'Could not load store products.');
        }
        setDemoProducts(demoResult.products.map((product) => ({ ...product, source: 'demo' })));

        if (!stripeResponse.ok) {
          throw new Error(stripeResult.error || 'Could not load Stripe products.');
        }
        setStripeProducts(stripeResult.products.map((product) => ({ ...product, source: 'stripe' })));
        setStripeCatalogError('');
      } catch (loadError) {
        console.error('Product catalog loading failed:', loadError);
        setStripeCatalogError(loadError.message || 'Unable to load products.');
      } finally {
        setIsCatalogLoading(false);
      }
    }

    loadCatalog();
  }, []);

  
async function startPayment() {
  if (paymentRequestInProgress.current || !selectedProduct) {
    return;
  }

  if (!user) {
    setError("Sign in or create an account before continuing to checkout.");
    return;
  }

  paymentRequestInProgress.current = true;
  setIsLoading(true);
  setError("");
  setClientSecret("");

  try {
    const response = await apiRequest('/create-payment-intent', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedProduct.source === 'stripe'
        ? { source: 'stripe', priceId: selectedProduct.priceId }
        : { source: 'demo', productId: selectedProduct.id }),
    });

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
    <main className="mx-auto flex min-h-screen w-[calc(100%_-_2rem)] max-w-[1180px] flex-col sm:w-[calc(100%_-_3rem)]">
      <header className="flex min-h-[88px] flex-wrap items-center justify-between gap-x-5 border-b border-border max-[520px]:gap-x-3">
        <a className="inline-flex min-h-[60px] items-center gap-3 text-[15px] font-bold tracking-[-0.45px] text-ink no-underline sm:text-base" href="/" aria-label="Simple Store home">
          <span className="grid size-9 place-items-center rounded-full bg-accent font-serif text-lg text-white shadow-[0_4px_10px_rgb(49_91_80_/_18%)]">S</span>
          <span>simple store</span>
        </a>
        <nav className="flex min-h-[44px] items-stretch gap-6 self-stretch max-[760px]:order-3 max-[760px]:w-full max-[520px]:gap-[18px] min-[761px]:gap-[30px]" aria-label="Product catalog">
          <button
            className={`relative cursor-pointer border-0 bg-transparent px-0.5 pt-1 text-[12px] font-medium text-muted transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-t after:bg-accent after:content-[''] hover:text-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)] sm:text-[13px] ${activeTab === 'all' ? 'font-semibold text-accent' : 'after:hidden'}`}
            type="button"
            aria-current={activeTab === 'all' ? 'page' : undefined}
            onClick={() => {
              setActiveTab('all');
              setSelectedProduct(null);
              setClientSecret('');
              setError('');
            }}
          >
            All
          </button>
          <button
            className={`relative cursor-pointer border-0 bg-transparent px-0.5 pt-1 text-[12px] font-medium text-muted transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-t after:bg-accent after:content-[''] hover:text-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)] sm:text-[13px] ${activeTab === 'stripe' ? 'font-semibold text-accent' : 'after:hidden'}`}
            type="button"
            aria-current={activeTab === 'stripe' ? 'page' : undefined}
            onClick={() => {
              setActiveTab('stripe');
              setSelectedProduct(null);
              setClientSecret('');
              setError('');
            }}
          >
            Stripe products
          </button>
        </nav>
        <span className="hidden items-center text-[11px] tracking-[0.02em] text-muted min-[761px]:inline-flex">
          <span className="mr-1.5 text-[9px] text-[#548166]" aria-hidden="true">●</span> Secure checkout
        </span>
      </header>

      <AuthPanel
        key={user?.id || 'anonymous'}
        user={user}
        loading={isAuthLoading}
        onSignedIn={(session) => {
          setAccessToken(session.accessToken);
          setUser(session.user);
          setError("");
        }}
        onSignedOut={() => {
          setAccessToken(null);
          setUser(null);
          setClientSecret("");
        }}
      />

      <section className="flex-1 py-10 sm:py-[58px] sm:pb-[76px]" aria-labelledby="catalog-title">
        {selectedProduct ? (
          <ProductDetail
            product={selectedProduct}
            onBack={() => {
              setSelectedProduct(null);
              setClientSecret('');
              setError('');
            }}
            onPay={() => {
              if (!stripePromise) {
                setError('Stripe is not configured. Set STRIPE_PUBLISHABLE_KEY in the workspace .env.local file.');
                return;
              }
              startPayment();
            }}
            isLoading={isLoading}
          >
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
                <PaymentForm
                  product={selectedProduct}
                  onStartNewPayment={startPayment}
                  onChooseAnother={() => {
                    setClientSecret('');
                    setError('');
                  }}
                />
              </Elements>
            ) : null}
          </ProductDetail>
        ) : (
          <>
            <div className="mb-[22px] flex items-end justify-between gap-5 sm:mb-[30px]">
              <div>
                <p className="mb-2.5 text-[10px] font-bold tracking-[1.8px] text-[#73897d]">THE EVERYDAY COLLECTION</p>
                <h1 className="m-0 font-serif text-[38px] font-normal tracking-[-1.5px] text-ink sm:text-[clamp(38px,4.4vw,52px)]" id="catalog-title">{activeTab === 'all' ? 'All products' : 'Stripe products'}</h1>
              </div>
              <span className="pb-[7px] text-xs text-muted">{visibleProducts.length} items</span>
            </div>
            <ProductList
              products={visibleProducts}
              loading={isCatalogLoading}
              error={activeTab === 'stripe' ? stripeCatalogError : ''}
              onSelect={(product) => {
                setSelectedProduct(product);
                setError('');
              }}
            />
          </>
        )}
        {!publishableKey && (
          <p className="mt-3.5 rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">
            Stripe is not configured. Set STRIPE_PUBLISHABLE_KEY in the workspace .env.local file and restart the client.
          </p>
        )}
        {error && <p className="mt-3.5 rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">{error}</p>}
        {paymentReturned && (
          <p className="mt-3.5 rounded-md border border-[#d7e8dc] bg-[#eaf3ed] px-3 py-[11px] text-xs leading-5 text-[#37634a]" role="status">
            Returned from Stripe. The backend records payment status after it receives and verifies Stripe's webhook.
          </p>
        )}
        {checkoutStatus === "success" && (
          <p className="mt-3.5 rounded-md border border-[#d7e8dc] bg-[#eaf3ed] px-3 py-[11px] text-xs leading-5 text-[#37634a]" role="status">
            You returned from hosted Checkout. Check Stripe Dashboard to confirm payment.
          </p>
        )}
        {checkoutStatus === "cancel" && (
          <p className="mt-3.5 rounded-md border border-transparent bg-[#f0f2ed] px-3 py-[11px] text-xs leading-5 text-[#59635f]" role="status">Checkout was canceled. Your card was not charged.</p>
        )}
      </section>

      <footer className="flex min-h-[68px] flex-col justify-center gap-1.5 border-t border-border py-[13px] text-[10px] text-muted sm:min-h-[68px] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0 sm:text-[11px]">
        <span>Thoughtfully made. Simply paid.</span>
        <span>Payments securely handled by Stripe</span>
      </footer>
    </main>
  );
}

export default App;
