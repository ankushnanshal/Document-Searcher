import { apiFetch } from './client.js';

export async function fetchPendingApprovalsApi() {
  return apiFetch('/documents/pending-approval');
}