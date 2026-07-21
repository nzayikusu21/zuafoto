// zuafoto — unified Worker entry point.
//
// Cloudflare's newer "Workers with static assets" model doesn't auto-route a
// /functions folder the way classic Pages Functions did — instead, one Worker
// script (this file) handles every request: API routes are matched manually
// below, and everything else falls through to the static asset handler.
//
// The actual endpoint logic still lives in functions/api/**/*.js — this file
// just imports and dispatches to those same handlers, so nothing about the
// auth/events/Cloudinary logic itself changed, only how requests reach it.

import { onRequestPost as loginPost } from '../functions/api/auth/login.js';
import { onRequestGet as mePost } from '../functions/api/auth/me.js';
import { onRequestPost as logoutPost } from '../functions/api/auth/logout.js';
import { onRequestGet as eventsGet, onRequestPost as eventsPost } from '../functions/api/events/index.js';
import { onRequestGet as eventGetOne } from '../functions/api/events/[slug].js';
import { onRequestPost as uploadSignPost } from '../functions/api/upload-sign.js';
import { onRequestGet as galleryGet } from '../functions/api/gallery/[slug].js';
import { onRequestGet as pendingGet } from '../functions/api/moderation/[slug]/pending.js';
import { onRequestPost as approvePost } from '../functions/api/moderation/[slug]/approve.js';
import { onRequestPost as rejectPost } from '../functions/api/moderation/[slug]/reject.js';

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ---- exact-path API routes ----
      if (path === '/api/auth/login' && method === 'POST') return await loginPost({ request, env });
      if (path === '/api/auth/me' && method === 'GET') return await mePost({ request, env });
      if (path === '/api/auth/logout' && method === 'POST') return await logoutPost({ request, env });
      if (path === '/api/events' && method === 'GET') return await eventsGet({ request, env });
      if (path === '/api/events' && method === 'POST') return await eventsPost({ request, env });
      if (path === '/api/upload-sign' && method === 'POST') return await uploadSignPost({ request, env });

      // ---- dynamic :slug API routes ----
      let m;

      if ((m = path.match(/^\/api\/events\/([^/]+)$/)) && method === 'GET') {
        return await eventGetOne({ params: { slug: decodeURIComponent(m[1]) }, env });
      }
      if ((m = path.match(/^\/api\/gallery\/([^/]+)$/)) && method === 'GET') {
        return await galleryGet({ params: { slug: decodeURIComponent(m[1]) }, env });
      }
      if ((m = path.match(/^\/api\/moderation\/([^/]+)\/pending$/)) && method === 'GET') {
        return await pendingGet({ request, params: { slug: decodeURIComponent(m[1]) }, env });
      }
      if ((m = path.match(/^\/api\/moderation\/([^/]+)\/approve$/)) && method === 'POST') {
        return await approvePost({ request, params: { slug: decodeURIComponent(m[1]) }, env });
      }
      if ((m = path.match(/^\/api\/moderation\/([^/]+)\/reject$/)) && method === 'POST') {
        return await rejectPost({ request, params: { slug: decodeURIComponent(m[1]) }, env });
      }

      if (path.startsWith('/api/')) {
        return jsonError('not_found', 404);
      }
    } catch (err) {
      return jsonError('internal_error: ' + String(err), 500);
    }

    // ---- static assets ----
    // Any /e/<slug> path (e.g. /e/mariage-clara) serves the same guest gallery
    // HTML file — the client-side script reads the slug from the URL path.
    if (path.startsWith('/e/') && path !== '/e/index.html') {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = '/e/index.html';
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
