const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://stripe-subscription-muw7.onrender.com'
    : 'http://localhost:3000')
).replace(/\/+$/, '');

let accessToken = null;
let refreshRequest = null;

function isSessionResponse(result) {
  return Boolean(
    result
    && typeof result.accessToken === 'string'
    && result.accessToken.length > 0
    && result.user
    && typeof result.user.id === 'string'
    && typeof result.user.email === 'string'
    && ['customer', 'admin'].includes(result.user.role),
  );
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:expired'));
  }
}

export function setAccessToken(token) {
  accessToken = typeof token === 'string' && token.length > 0 ? token : null;
}

export async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (response.status === 401) {
        accessToken = null;
        notifySessionExpired();
        return null;
      }
      if (!response.ok) {
        throw new Error('Could not restore the sign-in session.');
      }

      const result = await response.json();
      if (!isSessionResponse(result)) {
        throw new Error('The authentication service returned an invalid session.');
      }
      accessToken = result.accessToken;
      return result;
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function apiRequest(path, options = {}) {
  const makeRequest = () => {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  let response = await makeRequest();
  const isCredentialSubmission = path === '/auth/login' || path === '/auth/register';
  if (response.status === 401 && accessToken && !isCredentialSubmission && path !== '/auth/refresh') {
    const session = await refreshSession();
    if (session) {
      response = await makeRequest();
      if (response.status === 401) {
        accessToken = null;
        notifySessionExpired();
      }
    }
  }

  return response;
}
