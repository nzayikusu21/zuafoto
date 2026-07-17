import { requireAuth } from '../../../_lib/auth-guard.js';
import { cloudinaryBasicAuth, getCloudinaryConfig } from '../../../_lib/cloudinary.js';
import { jsonResponse } from '../../../_lib/hash.js';

// POST /api/moderation/:slug/approve — admin only
// Body: { publicId }
// Moves the asset from events/:slug/pending/... to events/:slug/approved/...
// via Cloudinary's rename endpoint — no download/re-upload round trip.
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
  const toPublicId = publicId.replace(`events/${slug}/pending/`, `events/${slug}/approved/`);

  const form = new URLSearchParams({
    from_public_id: publicId,
    to_public_id: toPublicId,
    overwrite: 'true',
  });

  const renameRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloud_name}/image/rename`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: cloudinaryBasicAuth(cfg.api_key, cfg.api_secret),
      },
      body: form,
    }
  );

  if (!renameRes.ok) {
    const detail = await renameRes.text();
    return jsonResponse({ error: 'cloudinary_error', detail }, 502);
  }

  return jsonResponse({ ok: true, publicId: toPublicId });
}
