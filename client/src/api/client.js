// In local dev, Vite proxies '/api' to the backend (see vite.config.js).
// In a static deployment (e.g. GitHub Pages) there is no proxy, so the full
// backend URL must be supplied at build time via VITE_API_BASE_URL.
const API_ROOT = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = API_ROOT.replace(/\/$/, '');

export async function fetchLanguages() {
  const res = await fetch(`${BASE_URL}/feedback/languages`);
  if (!res.ok) throw new Error('Failed to load languages');
  return res.json();
}

export async function fetchFeedbackList(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  const res = await fetch(`${BASE_URL}/feedback?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load feedback');
  return res.json();
}

export async function submitFeedback({ audioBlob, submitterName, siteName, languageCode }) {
  const form = new FormData();
  form.append('audio', audioBlob, 'recording.webm');
  if (submitterName) form.append('submitter_name', submitterName);
  if (siteName) form.append('site_name', siteName);
  if (languageCode) form.append('language_code', languageCode);

  const res = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to submit feedback');
  }

  return res.json();
}

export async function updateFeedbackEntry(id, updates) {
  const res = await fetch(`${BASE_URL}/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update feedback');
  return res.json();
}

export function audioUrl(id) {
  return `${BASE_URL}/feedback/${id}/audio`;
}

export async function testSarvamConnection() {
  const res = await fetch(`${BASE_URL}/feedback/test-connection`, { method: 'POST' });
  return res.json();
}
