export const PBKDF2_ITERATIONS = 100000;
export const HASH_BITS = 256;
export const SESSION_SHORT_MS = 1000 * 60 * 60 * 12;        // 12 hours
export const SESSION_TRUSTED_MS = 1000 * 60 * 60 * 24 * 30;  // 30 days

export function hex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hexStr) {
  const bytes = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  return bytes;
}

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS
  );
  return hex(derived);
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
