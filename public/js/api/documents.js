import { apiFetch } from './client.js';

export async function searchDocuments(params) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/documents/search?${qs}`);
}

export async function deleteDocumentApi(id, reason) {
  const r = await apiFetch(`/documents/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "" })
  });
  return { response: r, data: await r.json() };
}

export async function updateDocumentApi(id, payload) {
  const r = await apiFetch(`/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { response: r, data: await r.json() };
}

export async function uploadDocumentApi(formData) {
  const r = await apiFetch('/documents/upload', { method: "POST", body: formData });
  return { response: r, data: await r.json() };
}

export async function approveDocumentApi(id, comment) {
  const r = await apiFetch(`/documents/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment: comment || "" })
  });
  return { response: r, data: await r.json() };
}

export async function rejectDocumentApi(id, reason) {
  const r = await apiFetch(`/documents/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason })
  });
  return { response: r, data: await r.json() };
}