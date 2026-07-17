import { getCookie, jsonResponse } from '../../_lib/hash.js';

export async function onRequestGet({ request, env }) {
  const token = getCookie(request, 'zuafoto_session');
  if (!token) return jsonResponse({ authenticated: false });

  const record = await env.ADMIN_KV.get(`session:${token}`);
  if (!record) return jsonResponse({ authenticated: false });

  const { email, expiresAt } = JSON.parse(record);
  if (Date.now() > expiresAt) {
    await env.ADMIN_KV.delete(`session:${token}`);
    return jsonResponse({ authenticated: false });
  }

  return jsonResponse({ authenticated: true, email });
}
