import {
  hashPassword, safeEqual, randomToken,
  jsonResponse, SESSION_SHORT_MS, SESSION_TRUSTED_MS,
} from '../../_lib/hash.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const { email, password, trustDevice } = body;
  if (!email || !password) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }

  const record = await env.ADMIN_KV.get(`admin:${email.toLowerCase()}`);
  if (!record) {
    // Same error as wrong password — never reveal whether the email exists
    return jsonResponse({ error: 'invalid_credentials' }, 401);
  }

  const { salt, hash, iterations } = JSON.parse(record);
  const attemptHash = await hashPassword(password, salt, iterations);

  if (!safeEqual(attemptHash, hash)) {
    return jsonResponse({ error: 'invalid_credentials' }, 401);
  }

  const token = randomToken();
  const ttl = trustDevice ? SESSION_TRUSTED_MS : SESSION_SHORT_MS;
  const expiresAt = Date.now() + ttl;

  await env.ADMIN_KV.put(
    `session:${token}`,
    JSON.stringify({ email: email.toLowerCase(), expiresAt }),
    { expirationTtl: Math.floor(ttl / 1000) }
  );

  const cookie = [
    `zuafoto_session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(ttl / 1000)}`,
  ].join('; ');

  return jsonResponse({ ok: true, email: email.toLowerCase() }, 200, { 'Set-Cookie': cookie });
}
