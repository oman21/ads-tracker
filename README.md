# Ads Tracking Platform

Full-stack reference implementation for GAID/IDFA based ad delivery. The stack combines an AdonisJS (legacy v4) API with a React front-end (Node 16.20.2 compatible) that can create creatives, manage targeting, and share partner-ready pixel scripts.

## Features

- Create and manage ads with headline, creative, CTA, and optional GAID/IDFA allow-lists.
- Automatic slot key generation per ad with embeddable JavaScript for partner sites.
- Device-based delivery logic: if a GAID/IDFA filter is present the ad will only render for those identifiers, otherwise it is served to all devices by default.
- Tracking endpoints for impression, click, and conversion events with persistent analytics.
- JWT-secured CMS with login and logout flows.
- Reporting dashboard that surfaces partner, ad, and recent-activity summaries.
- React management console that shows stats in real time and produces snippets for partners.

## Getting Started

### Backend (AdonisJS v4)

```bash
cd backend
npm install
npx adonis migration:run    # runs migrations against your MySQL database
npx adonis seed --files AdminSeeder.js   # creates/updates the admin account
npm start                   # starts server on http://localhost:3333
```

Key environment variables live in `backend/.env`. The API now expects a reachable MySQL instance — set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` before running migrations.

#### Admin user / authentication

The CMS relies on Adonis JWT auth. Run `npx adonis seed --files AdminSeeder.js` to ensure at least one admin exists — the seeder only creates a default `admin@example.com / secret123` user when the `users` table is empty. Update or add accounts directly inside the database or via your own UI; credentials are no longer sourced from environment variables. Sign in from the frontend and copy the bearer token into the `Authorization` headers when calling `/api/ads/*` or `/api/reports/*`.

#### API Surface

All `/api/ads/*` and `/api/reports/*` routes require `Authorization: Bearer <jwt>`.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/auth/login` | Exchange `{ email, password }` for a JWT + user payload. |
| `GET` | `/api/ads` | List ads. |
| `POST` | `/api/ads` | Create a new ad. Provide a `slotKey` (string) that represents the widget/placement this ad competes in, plus targeting arrays such as `targetingGeo`, `targetingProvinces`, `targetingCities`, `targetingDevices`, `targetingInterests`, `targetingGaids`, and `targetingIdfas` (each can be an array or comma string). Ads that share the same `slotKey` will participate in the same auction. |
| `PUT`/`DELETE` | `/api/ads/:id` | Update or remove ads. |
| `GET` | `/api/ads/:id/stats` | Aggregated impression/click/conversion counts. |
| `GET` | `/api/ads/:id/snippet` | Returns the `<script>` tag prefilled with the ad’s slot key. Optional `baseUrl` query overrides the host. |
| `GET` | `/api/reports/overview` | Aggregated totals, partner breakdown, top ads, and recent tracking events. |
| `GET` | `/api/pixels/:slotKey/ad` | Delivery endpoint used by the embed script with `deviceType` + `deviceId` query params. |
| `GET` | `/api/pixels/:slotKey/embed.js` | JavaScript slot loader for partners. |
| `POST` | `/api/pixels/:slotKey/track` | Accepts `{ eventType: 'impression'|'click'|'conversion', deviceType, deviceId, metadata }`. |

Partner integration example (note that the path segment acts as the slot key — reuse it for every ad that should bid on that slot):

```html
<div id="ads-slot"></div>
<script
  src="https://your-api.com/api/pixels/news-homepage/embed.js"
  data-slot="news-homepage"
  data-partner="publisherA"
  data-container-id="ads-slot"
  data-category="news"            <!-- optional interest/category hint -->
  data-device-type="gaid"          <!-- optional: only include if advertiser requires GAID/IDFA -->
  data-device-id="GAID-123"        <!-- optional -->
  data-country="id"                <!-- optional targeting context -->
  data-province="jawa barat"       <!-- optional -->
  data-city="bandung"              <!-- optional -->
  async
></script>
```

Once the creative renders the script automatically records impressions and clicks. Partners can trigger conversions by calling `window.adsPixelConversion_publisherA({ orderId: '123' })` (an alias keyed by partner as well as the raw slot ID).

> 💡 Reuse the same slot key (`news-homepage` in the example above) across different campaigns if you want them to compete for that placement; the Ad Server will automatically pick the highest valid bid per request.

Creative types:

- `box` — inline card rendered inside the provided container (default).
- `modal` — full-screen popup with a dismiss button; the embed script injects its own overlay so partners only need to include the `<script>` tag.

### Frontend (React)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 by default
```

Environment variables for the UI live in `frontend/.env.development`:

```
VITE_API_URL=http://localhost:3333/api
VITE_PIXEL_BASE_URL=http://localhost:3333
```

Adjust them when deploying.

## Testing the flow

1. Start the Adonis API, run migrations, and seed the admin user.
2. Start the React dev server and sign in with the seeded credentials.
3. Create a new ad in the UI, choose (or reuse) a slot key so multiple ads can compete in the same widget, and fill in country/province/city, device, or GAID/IDFA filters as needed.
4. Click “Generate partner snippet” to see the `<script>` tag (per slot key) and drop it into a test HTML page.
5. When dropping the snippet into a page, always include `data-partner` (for revenue attribution) and optionally add contextual attributes such as `data-country`, `data-province`, `data-city`, `data-category`, `data-device-class`, `data-device-type`, and `data-device-id` when the advertiser has targeting constraints. If no targeting values are set, you can omit them and the ad will render for everyone by default.
6. Use the CTA inside the rendered ad to generate click events; trigger conversions with the exposed `window.adsPixelConversion_<partnerKey>` helper.
7. Return to the CMS dashboard to view the reporting cards populate with new totals, partner rows, and recent activity.

That’s it! The API will persist analytics inside MySQL and the UI polls the stats endpoint to show updated counters.
