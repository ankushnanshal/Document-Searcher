import { apiFetch } from './client.js';

export async function logHistoryApi(title, documentId) {
  return apiFetch('/history', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, documentId })
  });
}

export async function fetchHistoryApi(email) {
  return apiFetch(`/history/${encodeURIComponent(email)}`);
}

export async function clearHistoryApi(email) {
  return apiFetch(`/history/${encodeURIComponent(email)}`, { method: "DELETE" });
}