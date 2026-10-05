# Ishita Traders — Admin console

Everything behind `/admin`: the product catalogue, enquiries from every website form, a unified
WhatsApp / email / SMS / phone inbox, site content & SEO, uploaded HTML pages and the
administration around them (users, roles, audit trail, backups).

> **Next.js routing note.** Next.js only discovers routes under `src/app`, so the admin's route
> files live in `src/app/admin/**` and `src/app/api/**`. They are thin: every one of them imports
> its logic from this folder.

## Stack (and why)

| Concern       | Choice                                                                  | Why                                                                                                |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| App           | Next.js 16 App Router (same app as the website)                         | One deploy, shared design tokens, Server Actions for every mutation (built-in CSRF origin checks). |
| Database      | PostgreSQL via **Drizzle ORM**                                          | Type-safe SQL, tiny runtime, plain SQL migrations committed to git.                                |
| Local DB      | **PGlite** (embedded Postgres in WebAssembly)                           | `npm run dev` works with zero setup; same SQL dialect as production.                               |
| Production DB | Any Postgres through `postgres.js` (Neon recommended on Vercel)         | Not locked to one vendor.                                                                          |
| Files         | Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise the database | Works on day one with only a database; moves to a CDN with one setting.                            |
| Images        | `sharp`                                                                 | Strips EXIF/GPS, auto-rotates, converts to WebP, makes blur placeholders.                          |
| Auth          | Own session layer (scrypt + DB sessions)                                | No third-party auth service; revocable sessions; roles.                                            |
| Validation    | Zod                                                                     | Same schemas on the server and in forms.                                                           |
| UI            | Tailwind v4 with the website's tokens, `lucide-react` icons             | The admin looks like part of the brand.                                                            |

## Folder structure

```
src/admin/
├── README.md              ← you are here
├── config/                ← navigation, permissions (role → capability)
├── content/               ← the website's read API for admin-managed data (+ client-safe types)
│   ├── settings-schema.ts   editable settings: Zod schemas + defaults (business, contact, hero, SEO…)
│   ├── settings.ts          getSiteSettings()           (cached, tag: content:settings)
│   ├── catalog.ts           getCatalog()                (cached, tag: content:catalog)
│   ├── content.ts           testimonials, FAQs, HTML pages, redirects
│   ├── images.ts            ImageRef (bundled or uploaded image) + resolveImage()
│   ├── links.ts             contactLinks() — WhatsApp / tel / mailto from settings
│   └── public-types.ts      shapes the website consumes
├── components/
│   ├── layout/            ← admin chrome (sidebar, top bar)
│   └── ui/                ← admin design system (buttons, forms, tables, dialogs, toasts…)
├── features/<feature>/    ← one folder per area: actions.ts ("use server"), queries.ts, components
├── lib/                   ← client-safe helpers (formatting, slugs, ActionState)
├── server/                ← server-only infrastructure
│   ├── db/                  client (PGlite/Postgres), schema, migrations, seed
│   ├── auth/                password hashing, sessions, guards
│   ├── security/            rate limiting, request metadata, IP hashing
│   ├── storage/             uploads (validation, image processing, Blob/DB storage)
│   ├── action.ts            runAction(), parseOrThrow(), FormError, formValue helpers
│   ├── audit.ts             logActivity(), diff()
│   ├── cache.ts             cache tags + refreshContent()/expireContent()
│   └── env.ts               typed environment access
├── site/                  ← pieces the admin injects into the public site (click tracker, announcement bar, GA)
└── styles/admin.css
```

## Conventions (read before adding a feature)

The **FAQs** feature (`features/faqs/*`, `app/admin/(panel)/faqs/page.tsx`) is the reference
implementation; copy its shape.

- **Pages** (`src/app/admin/(panel)/<area>/page.tsx`) are Server Components. First line:
  `await requirePermission("<area>:<read|write>")`. Read data with Drizzle directly or a
  `features/<area>/queries.ts` function. Export `metadata = { title }`.
- **Mutations** are Server Actions in `features/<area>/actions.ts` (`"use server"`), shaped
  `(state: ActionState, formData: FormData) => Promise<ActionState>` and wrapped in `runAction()`:
  1. `const user = await assertPermission("…")` (never trust the page check alone);
  2. validate with Zod via `parseOrThrow(schema, input)` (field errors flow back to the form);
  3. write with Drizzle (transactions for multi-row writes);
  4. `await logActivity(user, { action, entityType, entityId, summary, changes: diff(before, after) })`;
  5. `refreshContent(cacheTags.x)` when the public site shows this data;
  6. return a short success message (`"Product saved."`).
- **Forms** are Client Components using `useFormAction(action, { onSuccess })` (submits from the
  form's submit event — React would otherwise reset typed values even when validation fails),
  showing `errors[field]` through `<Field error>` and submitting with `<SubmitButton pending>`.
  One-click buttons use `<ActionButton>`; destructive actions use `<ConfirmAction>`. Results are
  toasted from the action callback, so a toast appears even when the action removed its button.
  Plain GET forms (`<FilterBar>`) drive list filters through the URL (shareable, no JS needed).
- **Refreshing**: actions that change public content call `refreshContent(cacheTags.x)`; actions
  that only change admin data (notes, enquiry status…) call `refresh()` from `next/cache`.
- **Lists**: `<Card>` + `<FilterBar>` + `<Table>/<TH>/<TD>` + `<Pagination>`; empty → `<EmptyState>`.
- **Permissions** live in `config/permissions.ts` (owner > admin > editor > viewer).
- **Never** import `server/*` from a Client Component; pass plain data as props.
- **Schema changes**: edit `server/db/schema.ts`, run `npm run db:generate`, commit the SQL.
  Migrations apply automatically on the next start.
- **Local database**: lives in `~/.ishita-traders/pglite` (override with `LOCAL_DATA_DIR`). Only
  the dev server may open it — never point a second process at the same folder.

## Run it locally

1. `npm install`
2. Create `.env.local` (see `.env.example`). The minimum for the admin:
   ```
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=a-long-password-you-choose
   ADMIN_NAME="Amit Kumar"
   AUTH_SECRET=any-long-random-string
   ```
3. `npm run dev` → http://localhost:3070 (website) and http://localhost:3070/admin (admin).
4. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The first sign-in creates the **owner** account;
   change its password under _Your account_. The local database is created and seeded
   automatically (`~/.ishita-traders/pglite`).

## Go live on Vercel

1. Create a PostgreSQL database (Vercel → Storage → **Neon**, free tier is plenty) and copy the
   **pooled** connection string into `DATABASE_URL`.
2. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Optional but recommended:
   - **Vercel Blob** store (Storage → Blob) → `BLOB_READ_WRITE_TOKEN` (uploads served from a CDN).
   - **Resend** → `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (email alert for every enquiry).
   - WhatsApp / email / SMS webhooks → see _Admin → Integrations_ for each URL and secret.
4. Deploy. Migrations and the starter content are applied on the first request; sign in at
   `/admin`. Without `DATABASE_URL` the public site still works (built-in content) and `/admin`
   explains what is missing.

## Database

- Schema: `server/db/schema.ts`. After changing it: `npm run db:generate` and commit the SQL in
  `server/db/migrations/`. Migrations run automatically at startup (`server/db/migrate.ts`).
- `npm run db:studio` opens Drizzle Studio on `DATABASE_URL` — or on the local database, but
  **stop the dev server first** (the embedded database allows one process at a time).
- Backups: _Admin → Backup & export_ downloads everything as JSON; CSV exports exist for
  products, enquiries, inbox and the activity log.

## How to test the admin (10 minutes)

1. **Products** – _Products → Add product_: name, brand, image (drag & drop), specs (★ = shown on
   the card), price/MRP, publish. Open `/products` — it's there; open its own page
   `/products/<slug>`. Try _Quick price editor_, bulk actions, _Duplicate_, and changing the web
   address (the old address now redirects).
2. **Enquiries** – submit the contact form on the homepage and an RFQ in any product's popup on
   `/products`. _Enquiries_ shows them grouped by form with every field; open one, set a status
   and follow-up date, add a note, reply on WhatsApp, export CSV.
3. **Inbox** – log a phone call; click a WhatsApp button on the website and see it under
   _Contact clicks_; set up webhooks in _Integrations_ for live WhatsApp/email/SMS.
4. **Site content** – change the phone number, social links, hero headline/image, announcement
   bar; reload the website. _Reset to original_ undoes a section.
5. **SEO & audit** – edit titles/descriptions (live Google preview), run the audit, fix issues.
6. **HTML pages** – upload an `.html` file, publish, open `/<slug>`.
7. **Users & roles** – create an editor, sign in as them in a private window (no Users menu).
8. **Activity log** – every change above is listed with who/when/what changed.
