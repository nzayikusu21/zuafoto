import { signCloudinaryParams, sanitizeContextValue, getCloudinaryConfig } from '../_lib/cloudinary.js';
import { jsonResponse } from '../_lib/hash.js';

// POST /api/upload-sign — public (guests aren't logged in), used right before
// the browser uploads a photo directly to Cloudinary. Never touches the file
// bytes itself — just proves the upload is allowed and scopes it to the
// event's "pending" folder for moderation.
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const { slug, guestName, tag } = body;
  if (!slug || !guestName) {
    return jsonResponse({ error: 'missing_fields' }, 400);
  }

  const record = await env.EVENTS_KV.get(`event:${slug}`);
  if (!record) return jsonResponse({ error: 'event_not_found' }, 404);

  const ev = JSON.parse(record);
  if (ev.status !== 'live') return jsonResponse({ error: 'event_closed' }, 403);

  const cfg = getCloudinaryConfig(env);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `events/${slug}/pending`;
  const context = `name=${sanitizeContextValue(guestName)}|tag=${sanitizeContextValue(tag || 'Spontané')}`;

  // Only these params are part of the signature — anything else added
  // client-side later (like the file itself) doesn't need signing.
  const paramsToSign = { context, folder, timestamp };
  const signature = await signCloudinaryParams(paramsToSign, cfg.api_secret);

  return jsonResponse({
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloud_name}/image/upload`,
    apiKey: cfg.api_key,
    timestamp,
    folder,
    context,
    signature,
  });
}
