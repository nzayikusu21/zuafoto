import { requireAuth } from '../../_lib/auth-guard.js';
import { uniqueSlug } from '../../_lib/slug.js';
import { jsonResponse } from '../../_lib/hash.js';

// GET /api/events — list all events (admin only)
export async function onRequestGet({ request, env }) {
  const email = await requireAuth(request, env);
  if (!email) return jsonResponse({ error: 'unauthorized' }, 401);

  const list = await env.EVENTS_KV.list({ prefix: 'event:' });
  const events = await Promise.all(
    list.keys.map(async (k) => JSON.parse(await env.EVENTS_KV.get(k.name)))
  );
  events.sort((a, b) => b.createdAt - a.createdAt);

  return jsonResponse({ events });
}

// POST /api/events — create a new event (admin only)
export async function onRequestPost({ request, env }) {
  const email = await requireAuth(request, env);
  if (!email) return jsonResponse({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const { name, welcomeMessage, eventDate, expiryDate, location, theme } = body;
  if (!name || !name.trim()) {
    return jsonResponse({ error: 'missing_name' }, 400);
  }

  const slug = await uniqueSlug(env, name);

  const event = {
    id: 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    slug,
    name: name.trim(),
    welcomeMessage: welcomeMessage || '',
    eventDate: eventDate || null,
    expiryDate: expiryDate || null,
    location: location || '',
    theme: theme || '#C6962E',
    coverImageUrl: null, // set once Cloudinary cover-upload is wired up
    status: 'live',
    photosPending: 0,
    photosApproved: 0,
    guests: 0,
    createdBy: email,
    createdAt: Date.now(),
  };

  await env.EVENTS_KV.put(`event:${slug}`, JSON.stringify(event));

  return jsonResponse({ event }, 201);
}
