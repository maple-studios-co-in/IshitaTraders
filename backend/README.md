# Ishita Traders API

A REST API for the Ishita Traders website. It serves the product catalogue, FAQs and testimonials,
and takes enquiries. It's built for a future mobile app, partners and integrations (CRM, Zapier), or
the website itself.

It uses **the website's own PostgreSQL database and schema**:

- the catalogue the API returns is exactly what the website shows;
- enquiries it receives appear in the website's admin under **Enquiries → "API enquiry"**.

The schema belongs to the website (`../src/admin/server/db/migrations`). This API reads and writes
those tables but never migrates them.

|            |                                                                                |
| ---------- | ------------------------------------------------------------------------------ |
| Runtime    | Node.js 22.9+ (ES modules)                                                     |
| Framework  | Express 5                                                                      |
| Database   | PostgreSQL via `pg`, parameterised SQL                                         |
| Validation | zod 4 (settings, params, queries, bodies)                                      |
| Security   | helmet, CORS allowlist, rate limits, API-key auth for admin routes, hashed IPs |
| Logging    | pino / pino-http (JSON in production, pretty in development), request ids      |
| Tests      | Node's built-in test runner + supertest, against a throwaway test database     |

## Folder structure

```
backend/
├── src/
│   ├── server.js              # process entry: listen, graceful shutdown, crash handling
│   ├── app.js                 # builds the Express app: middleware → routes → 404 → errors
│   ├── config/
│   │   └── env.js             # every setting, validated once at startup (fail fast)
│   ├── db/
│   │   └── pool.js            # PostgreSQL connection pool + query()
│   ├── lib/                   # small shared building blocks
│   │   ├── errors.js          # HttpError and helpers (400/401/404)
│   │   ├── ip-hash.js         # visitor IP → keyed hash (same scheme as the website)
│   │   ├── logger.js          # the pino logger
│   │   ├── media.js           # image/file references → URLs
│   │   └── webhook.js         # optional signed webhook for new enquiries
│   ├── middleware/
│   │   ├── cache-control.js   # public caching for catalogue GETs, no-store elsewhere
│   │   ├── error-handler.js   # every error → { error: { code, message, details, requestId } }
│   │   ├── not-found.js       # JSON 404 for unknown routes
│   │   ├── rate-limit.js      # API-wide limit + strict enquiry limit (stored in Postgres)
│   │   ├── require-api-key.js # Bearer API key for /admin routes
│   │   └── validate.js        # zod validation of params/query/body → req.valid
│   ├── modules/               # one folder per feature: routes → controller → repository
│   │   ├── catalog/           # brands, categories, products
│   │   ├── content/           # FAQs, testimonials
│   │   ├── enquiries/         # public create + admin list/read/update (+ service, schemas)
│   │   └── health/            # /health and /health/ready
│   └── routes/
│       └── index.js           # /api/v1 router: mounts the modules
├── scripts/
│   └── reset-test-db.js       # rebuilds the TEST database (refuses any other)
├── tests/                     # *.test.js + fixtures/ + helpers.js
├── .env.example               # every setting, documented (copy to .env)
├── eslint.config.js · .prettierrc.json
└── package.json
```

Each feature module splits its work the same way:

- **`*.routes.js`**: URL → middleware → handler.
- **`*.controller.js`**: HTTP in and out.
- **`*.service.js`**: business rules, where there are any.
- **`*.repository.js`**: SQL only.
- **`*.schemas.js`**: what the endpoint accepts.
- **`*.serializers.js`**: database row → API object.

## Getting started (local)

**1. Start the development database.** This is a separate PostgreSQL 16 server on port 5438 holding
a copy of the website's schema and catalogue, so practice never touches the live data. After a
reboot, double-click `C:\Users\asus\ishita-backend-local\start-db.cmd`.

**2. Create your settings.** Copy `.env.example` to `.env` and set `DATABASE_URL`. The local
database's address is in `C:\Users\asus\ishita-backend-local\connection.txt`.

**3. Install and run:**

```bash
npm install
npm run dev
```

The API listens on http://localhost:4000. Try `/health`, `/api/v1`, `/api/v1/products`.

If `npm install` stalls on this network, add `--registry=https://registry.npmmirror.com`.

| Script                            | What it does                                    |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Start with auto-restart on save, reading `.env` |
| `npm start`                       | Production start (settings come from the host)  |
| `npm test`                        | Rebuild the test database, then run every test  |
| `npm run lint`                    | ESLint                                          |
| `npm run format` / `format:check` | Prettier                                        |

## API reference

All endpoints answer JSON. Lists return `{ data: [...], meta: { page, limit, total, totalPages } }`,
and single items return `{ data: {...} }`.

### Public

| Method & path                | Description                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                | Liveness check: the process is up. It doesn't touch the database.                                                                                                   |
| `GET /health/ready`          | Readiness check: pings the database. Returns `503` if it can't reach it.                                                                                            |
| `GET /api/v1`                | Index of the endpoints.                                                                                                                                             |
| `GET /api/v1/brands`         | Active brands, with their published product counts.                                                                                                                 |
| `GET /api/v1/brands/:slug`   | One brand.                                                                                                                                                          |
| `GET /api/v1/categories`     | All categories, with their product counts.                                                                                                                          |
| `GET /api/v1/products`       | Published products. Filters: `brand`, `category` (comma list), `featured`, `q` (every word must match), `sort` (`default`/`name`/`newest`), `page`, `limit` (≤ 50). |
| `GET /api/v1/products/:slug` | Full product: description, specs, gallery, datasheet, SEO.                                                                                                          |
| `GET /api/v1/faqs`           | Published FAQs.                                                                                                                                                     |
| `GET /api/v1/testimonials`   | Published testimonials. Samples are excluded unless you pass `includeSamples=true`.                                                                                 |
| `POST /api/v1/enquiries`     | Create an enquiry. Rate-limited to 5 per 10 minutes per visitor.                                                                                                    |

Prices only appear when the admin has ticked "show price". Otherwise `price` is `null`. Images
uploaded in the admin come back with full URLs. Images bundled into the website's build come back
with `url: null` and a `key` naming the picture.

**Creating an enquiry:**

```bash
curl -X POST http://localhost:4000/api/v1/enquiries \
  -H "Content-Type: application/json" \
  -d '{"name":"Ravi Kumar","phone":"9876543210","subject":"Solar","message":"Need a 3kW rooftop quote.","productSlug":"utl-alpha-plus-3kva"}'
```

- **Required:** `name`, `phone` (an Indian mobile number) and `message` (at least 10 characters).
- **Optional:** `email`, `company`, `subject`, `productSlug`, `pageUrl`, `utm`.
- **Honeypot:** `website` is a trap field. A request that fills it gets a normal-looking reply but
  is not stored.

### Admin (only when `ADMIN_API_KEY` is set)

Send `Authorization: Bearer <ADMIN_API_KEY>` with every admin request.

| Method & path                       | Description                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/admin/enquiries`       | Newest first. Filters: `status`, `form`, `unread`, `q`, `page`, `limit` (≤ 100).                         |
| `GET /api/v1/admin/enquiries/:id`   | One enquiry.                                                                                             |
| `PATCH /api/v1/admin/enquiries/:id` | Body `{ "status"?: "new" \| "contacted" \| "quoted" \| "won" \| "lost" \| "spam", "isRead"?: boolean }`. |

### Errors

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Some values in the request are not valid.",
    "details": [{ "in": "body", "field": "phone", "message": "Please enter a valid 10-digit mobile number." }],
    "requestId": "3f1c…"
  }
}
```

| Code                | Status | Meaning                                                           |
| ------------------- | ------ | ----------------------------------------------------------------- |
| `validation_failed` | 400    | Some request values are invalid. `details` lists every one.       |
| `invalid_json`      | 400    | The request body isn't valid JSON.                                |
| `unknown_product`   | 400    | The `productSlug` doesn't match a published product.              |
| `unauthorized`      | 401    | The admin API key is missing or wrong.                            |
| `not_found`         | 404    | No such resource, or no such route.                               |
| `payload_too_large` | 413    | The request body is over 100 kB.                                  |
| `too_many_requests` | 429    | A rate limit was hit. See the `Retry-After` header.               |
| `internal_error`    | 500    | Something failed on the server. It's logged with the `requestId`. |

Every response carries an `X-Request-Id` header, and the logs use the same id, so you can find a
failing request quickly.

## Configuration

Every setting is described in `.env.example` and checked by `src/config/env.js`. If one is
invalid, the server refuses to start and names the setting.

## Testing

```bash
npm test
```

`npm test` rebuilds the **test** database (`ishita_test`, set in `.env.test`) from the website's
migrations and `tests/fixtures`, then runs every test. The reset script refuses to run unless
`NODE_ENV=test` and the database name ends in `_test`. CI does the same on every push
(`.github/workflows/backend-ci.yml`).

## Deploying (e.g. Render, Railway)

- **Root directory:** `backend`
- **Build command:** `npm ci --omit=dev`
- **Start command:** `npm start`
- **Health check path:** `/health/ready`
- **Settings:**
  - `NODE_ENV=production`
  - `TRUST_PROXY=1`
  - `DATABASE_URL`: the website's Neon URL, with `sslmode=verify-full`.
  - `CORS_ORIGINS=https://ishita-traders.vercel.app` (plus any other site that should call it).
  - `PUBLIC_SITE_URL=https://ishita-traders.vercel.app`
  - `IP_HASH_SECRET`: the website's `AUTH_SECRET`.
  - `ADMIN_API_KEY`: a long random value, only if you need the admin routes.
- **Schema changes** are still made in the website (`npm run db:generate` there). Deploy the website
  first, then the API.
