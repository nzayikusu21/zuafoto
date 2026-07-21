# zuafoto — deploy guide
 
## Structure
```
index.html                              -> marketing landing page (/)
admin/index.html                        -> admin dashboard (/admin)
e/index.html                            -> guest-facing event gallery (/e/:slug)
functions/api/auth/login.js             -> POST /api/auth/login
functions/api/auth/me.js                -> GET  /api/auth/me
functions/api/auth/logout.js            -> POST /api/auth/logout
functions/api/events/index.js           -> GET/POST /api/events (admin only)
functions/api/events/[slug].js          -> GET /api/events/:slug (public)
functions/api/upload-sign.js            -> POST /api/upload-sign (public, guest uploads)
functions/api/gallery/[slug].js         -> GET /api/gallery/:slug (public, approved photos)
functions/api/moderation/[slug]/pending.js  -> GET  (admin only)
functions/api/moderation/[slug]/approve.js  -> POST (admin only)
functions/api/moderation/[slug]/reject.js   -> POST (admin only)
functions/_lib/                         -> shared helpers (hashing, auth guard, slugs, Cloudinary signing)
create-admin.js                         -> local CLI to generate/seed admin credentials
```

Everything deploys together as one Cloudflare Pages project — the HTML files
are served as static assets, and anything under `functions/` automatically
becomes an API route at the matching `/api/...` path. No CORS to deal with,
no second deployment.

## 1. One-time setup

```bash
npm install -g wrangler
wrangler login          # opens your browser, connects your Cloudflare account
cd zuafoto-project
```

## 2. Create the project + KV stores

```bash
wrangler pages project create zuafoto
wrangler kv namespace create ADMIN_KV
wrangler kv namespace create EVENTS_KV
```

Both `kv namespace create` commands print an `id` — copy them for the next step.

## 3. Bind both KV namespaces to the Pages project

Dashboard → **Workers & Pages → zuafoto → Settings → Functions → KV namespace
bindings → Add binding**, once for each:
- Variable name: `ADMIN_KV` → the ADMIN_KV namespace
- Variable name: `EVENTS_KV` → the EVENTS_KV namespace

## 4. Set the ONE Cloudinary environment variable

If your dashboard only exposes a single environment variable slot, all three
Cloudinary credentials are combined into one JSON value instead of three
separate vars. Add exactly one variable:

- **Variable name:** `CLOUDINARY_CONFIG`
- **Value** (replace the placeholder with your real API secret from
  Cloudinary dashboard → Settings → API Keys):
  ```
  {"cloud_name":"dfumuvq9o","api_key":"856988375985647","api_secret":"<PASTE_YOUR_API_SECRET_HERE>"}
  ```
- **Type:** mark it **Encrypted/Secret** if that option is available — it
  contains your API secret, which can rename or delete anything in your
  Cloudinary account.

Via CLI instead, if you prefer (replace the placeholder first):
```bash
echo '{"cloud_name":"dfumuvq9o","api_key":"856988375985647","api_secret":"<PASTE_YOUR_API_SECRET_HERE>"}' | wrangler pages secret put CLOUDINARY_CONFIG
```

## 5. Seed the admin account

```bash
node create-admin.js admin@zuafoto.app "admin@zuafoto" --run --namespace-id=<ADMIN_KV id>
```

This stores a salted hash only — the real password is never written anywhere.

## 6. Deploy

```bash
wrangler pages deploy .
```

You'll get a live URL like `https://zuafoto.pages.dev`. Open `/admin` there
and log in with:
- **Email:** admin@zuafoto.app
- **Password:** admin@zuafoto

Every subsequent `wrangler pages deploy .` after you make changes updates the
same project — KV data and env vars persist across deploys.

## 7. Try the full guest flow once deployed

1. Log into `/admin`, create an event — note the slug shown in the QR panel.
2. Open `https://<your-domain>/e/<slug>` (or scan the QR) on another
   device/tab, enter a name, and upload a photo.
3. Back in `/admin`, open that event → Galerie — the photo should appear
   under "En attente." Click Publier.
4. Refresh the guest gallery (or tap "Actualiser") — the photo now shows up
   publicly.

## What's real now vs. still mocked

**Real (backed by KV + Cloudinary via Pages Functions):**
- Login / session / logout (`/api/auth/*`)
- Event creation and listing — persist across reloads and deploys
- Guest photo upload — signed, direct-to-Cloudinary, scoped to each event's
  `pending/` folder
- Public gallery feed — reads only the `approved/` folder
- Admin moderation — list pending, approve (Cloudinary rename, no
  download/re-upload), reject (delete)
- The guest-facing gallery page (`/e/:slug`) — fully wired to the above


**Still mocked — next pieces to build:**
- Event cover photo upload doesn't persist yet (preview is local-only)
- Réglages (guest permissions, gallery visibility, access code) don't persist
- "No approval needed" gallery visibility option isn't enforced — approval is
  always required right now
- Automatic gallery expiry when `expiryDate` passes isn't enforced yet
- Multi-tenant organizer accounts — right now there's a single shared admin
  login
