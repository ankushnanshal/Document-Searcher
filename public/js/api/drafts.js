import { apiFetch } from './client.js';

export async function fetchDraftsApi() {
  return apiFetch('/documents/drafts');
}

export async function fetchPendingApprovalApi() {
  return apiFetch('/documents/pending-approval');
}

export async function publishDraftApi(id) {
  const r = await apiFetch(`/documents/publish/${id}`, { method: "POST" });
  return { response: r, data: await r.json() };
}

export async function deleteDraftApi(id) {
  const r = await apiFetch(`/documents/draft/${id}`, { method: "DELETE" });
  return { response: r, data: await r.json() };
}