import { API_URL } from '../config.js';
import { state } from '../state.js';

export async function apiFetch(path, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } };
  if (state.authToken && !opts.headers['Authorization']) {
    opts.headers['Authorization'] = `Bearer ${state.authToken}`;
  }
  return fetch(`${API_URL}${path}`, opts);
}

export { API_URL };