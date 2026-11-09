import { apiFetch } from './client.js';

export async function loginApi(email, password) {
  const r = await fetch(`${(await import('../config.js')).API_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return { response: r, data: await r.json() };
}

export async function signupApi(payload) {
  const r = await fetch(`${(await import('../config.js')).API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { response: r, data: await r.json() };
}

export async function fetchMe() {
  return apiFetch('/auth/me');
}

export async function updateAvatar(base64) {
  const r = await apiFetch('/auth/update-avatar', {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatar: base64 })
  });
  return { response: r, data: await r.json() };
}