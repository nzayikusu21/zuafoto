import { requireAuth } from '../../../_lib/auth-guard.js';
import { cloudinaryBasicAuth, getCloudinaryConfig } from '../../../_lib/cloudinary.js';
import { jsonResponse } from '../../../_lib/hash.js';

// GET /api/moderation/:slug/pending — admin only
export async function onRequestGet({ request, params, env }) {
  const email = await requireAuth(request, env);
  if (!email) return jsonResponse({ error: 'unauthorized' }, 401);

  const { slug } = params;
  const cfg = getCloudinaryConfig(env);

  const searchRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloud_name}/resources/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: cloudinaryBasicAuth(cfg.api_key, cfg.api_secret),
      },
      body: JSON.stringify({
        expression: `folder=events/${slug}/pending`,
        with_field: ['context'],
        max_results: 100,
        sort_by: [{ created_at: 'desc' }],
      }),
    }
  );

  if (!searchRes.ok) return jsonResponse({ error: 'cloudinary_error' }, 502);

  const data = await searchRes.json();
  const photos = (data.resources || []).map((r) => ({
    publicId: r.public_id,
    url: r.secure_url,
    name: r.context?.custom?.name || 'Invité',
    tag: r.context?.custom?.tag || 'Spontané',
    createdAt: r.created_at,
  }));

  return jsonResponse({ photos });
}
