// Same-origin requests only. Authentication stays in the Firebase SDK.
export async function apiRequest(path, options = {}) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('External API requests are not configured');
  const response = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin', ...options });
  if (!response.ok) throw new Error('Request could not be completed');
  return response.json();
}
export const apiClient = Object.freeze({
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, data, options = {}) => apiRequest(path, { ...options, method: 'POST', headers: { ...options.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
});
