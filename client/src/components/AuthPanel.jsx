import { useRef, useState } from 'react';
import { apiRequest } from '../api';

async function readResponse(response) {
  if (response.status === 204) {
    return {};
  }

  const body = await response.text();
  if (!body) {
    return {};
  }

  try {
    const result = JSON.parse(body);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error();
    }
    return result;
  } catch {
    throw new Error('The authentication service returned an invalid response.');
  }
}

function AuthPanel({ user, loading, onSignedIn, onSignedOut }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoadingPrivateData, setIsLoadingPrivateData] = useState(false);
  const [purchases, setPurchases] = useState(null);
  const [adminUsers, setAdminUsers] = useState(null);
  const credentialSubmissionInProgress = useRef(false);
  const signOutInProgress = useRef(false);
  const privateRequestInProgress = useRef(false);

  async function submitCredentials(event) {
    event.preventDefault();
    if (credentialSubmissionInProgress.current) {
      return;
    }

    credentialSubmissionInProgress.current = true;
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(result.error || 'Authentication request failed.');
      }

      if (mode === 'register') {
        setMessage(result.message || 'If an account can be created, you can now sign in.');
        setMode('login');
        setPassword('');
      } else {
        if (
          typeof result.accessToken !== 'string'
          || !result.user
          || typeof result.user.id !== 'string'
          || typeof result.user.email !== 'string'
          || !['customer', 'admin'].includes(result.user.role)
        ) {
          throw new Error('The authentication service returned an invalid sign-in response.');
        }
        onSignedIn(result);
        setPassword('');
      }
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Could not reach the authentication service. Check your connection and try again.'
        : requestError.message || 'Authentication failed. Please try again.');
    } finally {
      credentialSubmissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    if (signOutInProgress.current) {
      return;
    }
    signOutInProgress.current = true;
    setError('');
    setIsSigningOut(true);
    try {
      const response = await apiRequest('/auth/logout', { method: 'POST' });
      if (!response.ok) {
        const result = await readResponse(response);
        throw new Error(result.error || 'Could not sign out.');
      }
      onSignedOut();
      setPurchases(null);
      setAdminUsers(null);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Could not reach the authentication service. You are still signed in.'
        : requestError.message || 'Could not sign out.');
    } finally {
      signOutInProgress.current = false;
      setIsSigningOut(false);
    }
  }

  async function loadPrivateList(path, key, setValue) {
    if (privateRequestInProgress.current) {
      return;
    }
    privateRequestInProgress.current = true;
    setError('');
    setIsLoadingPrivateData(true);
    try {
      const response = await apiRequest(path);
      const result = await readResponse(response);
      if (!response.ok) {
        throw new Error(result.error || 'Could not load account data.');
      }
      if (!Array.isArray(result[key])) {
        throw new Error('The account service returned invalid account data.');
      }
      setValue(result[key]);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? 'Could not reach the authentication service. Check your connection and try again.'
        : requestError.message || 'Could not load account data.');
    } finally {
      privateRequestInProgress.current = false;
      setIsLoadingPrivateData(false);
    }
  }

  if (loading) {
    return <div className="mt-3.5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-white/85 px-3.5 py-3.5 text-sm text-ink shadow-[0_5px_18px_rgb(37_54_45_/_3%)] sm:mt-5 sm:px-[18px] sm:py-[15px]" role="status">Restoring sign-in…</div>;
  }

  if (user) {
    return (
      <section className="mt-3.5 flex flex-wrap items-center justify-start gap-4 rounded-lg border border-border bg-white/85 px-3.5 py-3.5 text-sm text-ink shadow-[0_5px_18px_rgb(37_54_45_/_3%)] sm:mt-5 sm:justify-between sm:px-[18px] sm:py-[15px]" aria-label="Account">
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <span>Signed in as <strong className="font-semibold text-ink">{user.email}</strong></span>
          <button className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent underline decoration-1 underline-offset-[3px] hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgb(105_148_128_/_48%)] disabled:cursor-wait disabled:opacity-60" type="button" onClick={signOut} disabled={isSigningOut}>{isSigningOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <button
            className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent underline decoration-1 underline-offset-[3px] hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgb(105_148_128_/_48%)]"
            type="button"
            disabled={isLoadingPrivateData}
            onClick={() => loadPrivateList('/purchases', 'purchases', setPurchases)}
          >
            {isLoadingPrivateData ? 'Loading…' : 'My purchases'}
          </button>
          {user.role === 'admin' && (
            <button
              className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent underline decoration-1 underline-offset-[3px] hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgb(105_148_128_/_48%)]"
              type="button"
              disabled={isLoadingPrivateData}
              onClick={() => loadPrivateList('/auth/admin/users', 'users', setAdminUsers)}
            >
              Admin users
            </button>
          )}
        </div>
        {purchases && (
          <ul className="m-0 max-h-[180px] w-full list-disc overflow-auto border border-border rounded-md bg-[#fbfcf9] py-[9px] pl-7 pr-3 text-xs leading-[1.8] text-[#59635f]" aria-label="My purchases">
            {purchases.length === 0
              ? <li>No completed purchases yet.</li>
              : purchases.map((purchase) => (
                <li key={purchase.id}>
                  {purchase.productName} — {purchase.status}
                </li>
              ))}
          </ul>
        )}
        {adminUsers && (
          <ul className="m-0 max-h-[180px] w-full list-disc overflow-auto border border-border rounded-md bg-[#fbfcf9] py-[9px] pl-7 pr-3 text-xs leading-[1.8] text-[#59635f]" aria-label="Users">
            {adminUsers.map((account) => (
              <li key={account.id}>{account.email} — {account.role}</li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3.5 w-full rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="mt-3.5 flex flex-wrap items-start justify-start gap-x-6 gap-y-4 rounded-lg border border-border bg-white/85 px-3.5 py-3.5 text-sm text-ink shadow-[0_5px_18px_rgb(37_54_45_/_3%)] sm:mt-5 sm:items-center sm:justify-between sm:px-[18px] sm:py-[15px]" aria-label="Sign in or create an account">
      <form className="flex w-full flex-wrap items-end gap-2.5 sm:w-auto sm:gap-3" onSubmit={submitCredentials}>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-[11px] font-semibold tracking-[0.01em] text-[#65736d]">
          Email
          <input
            className="min-h-[39px] w-full rounded-md border border-[#dfe4dc] bg-[#fcfdfa] px-[11px] py-2 text-xs text-ink transition focus-visible:border-[#77998b] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(105_148_128_/_15%)] sm:w-[190px]"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1.5 text-[11px] font-semibold tracking-[0.01em] text-[#65736d]">
          Password
          <input
            className="min-h-[39px] w-full rounded-md border border-[#dfe4dc] bg-[#fcfdfa] px-[11px] py-2 text-xs text-ink transition focus-visible:border-[#77998b] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(105_148_128_/_15%)] sm:w-[190px]"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'register' ? 12 : undefined}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="min-h-[39px] flex-1 cursor-pointer rounded-md border border-accent bg-accent px-[15px] text-xs font-semibold text-white transition hover:border-accent-hover hover:bg-accent-hover active:translate-y-px disabled:cursor-wait disabled:opacity-70 sm:flex-none" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button
        className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent underline decoration-1 underline-offset-[3px] hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgb(105_148_128_/_48%)]"
        disabled={isSubmitting}
        type="button"
        onClick={() => {
          setMode(mode === 'register' ? 'login' : 'register');
          setMessage('');
          setError('');
        }}
      >
        {mode === 'register' ? 'Already have an account? Sign in' : 'Create an account'}
      </button>
      {message && <p className="mt-3.5 w-full rounded-md border border-[#d7e8dc] bg-[#eaf3ed] px-3 py-[11px] text-xs leading-5 text-[#37634a]" role="status">{message}</p>}
      {error && <p className="mt-3.5 w-full rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">{error}</p>}
    </section>
  );
}

export default AuthPanel;
