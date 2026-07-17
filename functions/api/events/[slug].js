import { jsonResponse } from '../../_lib/hash.js';

// GET /api/events/:slug — public, used by the guest landing page
export async function onRequestGet({ params, env }) {
  const { slug } = params;
  const record = await env.EVENTS_KV.get(`event:${slug}`);
  if (!record) return jsonResponse({ error: 'not_found' }, 404);

  const ev = JSON.parse(record);

  // Only return what a guest is allowed to see — never expose createdBy, id, etc.
  return jsonResponse({
    slug: ev.slug,
    name: ev.name,
    welcomeMessage: ev.welcomeMessage,
    coverImageUrl: ev.coverImageUrl,
    theme: ev.theme,
    status: ev.status,
    expiryDate: ev.expiryDate,
  });
}
