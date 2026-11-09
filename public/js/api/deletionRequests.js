import { apiFetch } from './client.js';

export async function createDeletionRequest(payload) {
  const r = await apiFetch('/deletion-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { response: r, data: await r.json() };
}

export async function getIncomingRequests() {
  return apiFetch('/deletion-requests/incoming');
}

export async function getOutgoingRequests() {
  return apiFetch('/deletion-requests/outgoing');
}

export async function approveRequest(id, responseComment) {
  const r = await apiFetch(`/deletion-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responseComment })
  });
  return { response: r, data: await r.json() };
}

export async function rejectRequest(id, responseComment) {
  const r = await apiFetch(`/deletion-requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responseComment })
  });
  return { response: r, data: await r.json() };
}

export async function cancelRequest(id) {
  const r = await apiFetch(`/deletion-requests/${id}/cancel`, { method: 'POST' });
  return { response: r, data: await r.json() };
}

export async function getPendingCount() {
  return apiFetch('/deletion-requests/pending-count');
}