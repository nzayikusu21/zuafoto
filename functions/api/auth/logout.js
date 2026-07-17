import { getCookie, jsonResponse } from '../../_lib/hash.js';

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, 'zuafoto_session');
  if (token) await env.ADMIN_KV.delete(`session:${token}`);

  const cookie = 'zuafoto_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': cookie });
}
