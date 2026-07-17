import { getCookie } from './hash.js';

/**
 * Returns the logged-in admin's email if the session cookie is valid,
 * or null if not authenticated. Use to gate any admin-only endpoint.
 */
export async function requireAuth(request, env) {
  const token = getCookie(request, 'zuafoto_session');
  if (!token) return null;

  const record = await env.ADMIN_KV.get(`session:${token}`);
  if (!record) return null;

  const { email, expiresAt } = JSON.parse(record);
  if (Date.now() > expiresAt) {
    await env.ADMIN_KV.delete(`session:${token}`);
    return null;
  }
  return email;
}
