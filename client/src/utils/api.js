/**
 * DGDASH Client API Utility with Auto-Bearer Token Forwarding
 */

const STORAGE_KEY = 'dg_auth_token';

export async function fetchWithAuth(url, options = {}) {
  const headers = new Headers(options.headers || {});

  // Retrieve auth token from localStorage
  let token = null;
  try {
    token = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to access localStorage for auth token:', err);
  }

  // Auto-inject Bearer authorization header if not explicitly set
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Auto-set Content-Type: application/json if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers
  });
}
