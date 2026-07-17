import { requireAuth } from '../../../_lib/auth-guard.js';
import { cloudinaryBasicAuth, getCloudinaryConfig } from '../../../_lib/cloudinary.js';
import { jsonResponse } from '../../../_lib/hash.js';

// POST /api/moderation/:slug/reject — admin only
// Body: { publicId }
// Permanently deletes the asset from Cloudinary.
export async function onRequestPost({ request, params, env }) {
  const email = await requireAuth(request, env);
  if (!email) return jsonResponse({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const { publicId } = body;
  const { slug } = params;
  if (!publicId) return jsonResponse({ error: 'missing_public_id' }, 400);
  if (!publicId.startsWith(`events/${slug}/pending/`)) {
    return jsonResponse({ error: 'public_id_mismatch' }, 400);
  }

  const cfg = getCloudinaryConfig(env);
  const form = new URLSearchParams({ public_id: publicId });

  const destroyRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloud_name}/image/destroy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: cloudinaryBasicAuth(cfg.api_key, cfg.api_secret),
      },
      body: form,
    }
  );

  if (!destroyRes.ok) {
    const detail = await destroyRes.text();
    return jsonResponse({ error: 'cloudinary_error', detail }, 502);
  }

  return jsonResponse({ ok: true });
}
