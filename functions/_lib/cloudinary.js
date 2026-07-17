// Some hosting setups only allow a single environment variable to be added.
// To work around that, all three Cloudinary credentials are combined into
// one JSON variable: CLOUDINARY_CONFIG = {"cloud_name":"...","api_key":"...","api_secret":"..."}
export function getCloudinaryConfig(env) {
  if (!env.CLOUDINARY_CONFIG) {
    throw new Error('CLOUDINARY_CONFIG environment variable is not set');
  }
  try {
    return JSON.parse(env.CLOUDINARY_CONFIG);
  } catch {
    throw new Error('CLOUDINARY_CONFIG is not valid JSON');
  }
}

export async function sha1Hex(str) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-1', enc.encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reads all three Cloudinary credentials from a single combined env var,
 * e.g. CLOUDINARY_CONFIG = '{"cloud_name":"...","api_key":"...","api_secret":"..."}'
 * Used instead of three separate env vars when the dashboard only allows one.
 */
export function getCloudinaryConfig(env) {
  const raw = env.CLOUDINARY_CONFIG;
  if (!raw) {
    throw new Error('CLOUDINARY_CONFIG env var is not set');
  }
  return JSON.parse(raw);
}

export function cloudinaryBasicAuth(apiKey, apiSecret) {
  return 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
}

/**
 * Cloudinary's signed-upload scheme: sort params alphabetically by key,
 * join as key=value&key=value, append the api_secret (no separator), SHA1 it.
 * https://cloudinary.com/documentation/signatures
 */
export async function signCloudinaryParams(params, apiSecret) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return sha1Hex(sorted + apiSecret);
}

// Cloudinary's context format is key=value|key2=value2 — strip characters that would break it
export function sanitizeContextValue(str) {
  return (str || '').replace(/[|=]/g, '').trim();
}
