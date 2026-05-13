// Tiny auth state. No context provider needed for this size of app — components
// read from localStorage and re-render on route change.

export function getToken() {
  return localStorage.getItem('token');
}

export function getAgent() {
  const raw = localStorage.getItem('agent');
  return raw ? JSON.parse(raw) : null;
}

export function setSession({ token, agent }) {
  localStorage.setItem('token', token);
  localStorage.setItem('agent', JSON.stringify(agent));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('agent');
}

export function isAuthenticated() {
  return !!getToken();
}
