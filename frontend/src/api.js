// Compute backend base. If REACT_APP_BACKEND_URL env is set, use it.
// Otherwise default to localhost:3001 (legacy) but allow override at runtime via window.__BACKEND_URL.
const API_BASE = (typeof window !== 'undefined' && window.__BACKEND_URL)
  ? `${window.__BACKEND_URL}/api`
  : (process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:3001/api');

function getToken() {
  return localStorage.getItem('token');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  if (res.status === 401 || res.status === 403) {
    logout();
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}
