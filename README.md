# Ishita Traders — Website

Marketing site for **Ishita Traders** (Chakia, East Champaran, Bihar) — authorised UTL, Exide and Microtek
distributor for solar panels, inverters, batteries and turnkey solar installations.
Implemented from the Figma file _Ishita Traders → Final work – website → Homepage_.

## Tech stack

| Concern       | Choice                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, React 19, Turbopack) — homepage is fully static |
| Language      | TypeScript (strict)                                                     |
| Styling       | Tailwind CSS v4 with design tokens from the Figma file (`globals.css`)  |
| Motion        | `motion` (LazyMotion, ~15 kB) + CSS keyframes for the hero              |
| Smooth scroll | Lenis (wheel/trackpad only; native touch; off for reduced motion)       |
| Forms         | React 19 Server Action + Zod validation (server-only)                   |
| Images        | `next/image` (AVIF/WebP, responsive `sizes`, blur placeholders)         |
| Fonts         | `next/font` self-hosted Inter, Plus Jakarta Sans, Outfit, Jost          |
| Quality       | ESLint (next/core-web-vitals), Prettier + Tailwind class sorting        |

## Getting started

Requires Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # then fill in the values you need
npm run dev                  # http://localhost:3070
```

| Script           | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | Development server on port 3070                 |
| `npm run build`  | Production build                                |
| `npm start`      | Serve the production build on port 3070         |
| `npm run check`  | Type-check + lint + formatting check (CI-ready) |
| `npm run format` | Format everything with Prettier                 |

> Don't run `npm run build` while `npm run dev` is running — both write to `.next/`.

## Project structure

```
src/
├─ actions/contact.ts          Server Action for the contact form
├─ app/                        Routes, metadata (robots, sitemap, manifest), icons, error/404 pages
├─ assets/images/              Optimised WebP/PNG assets exported from Figma
├─ components/
│  ├─ icons.tsx                Generated SVG icon set (from the Figma exports)
│  ├─ layout/                  Site header (scroll-spy, mobile menu) and footer
│  ├─ motion/                  Reveal-on-scroll primitives, lazily loaded drag features
│  ├─ providers/               Motion + smooth-scroll providers
│  ├─ sections/                One file per homepage section
│  └─ ui/                      Button, SmartLink, section headings
├─ config/                     Site facts (phone, email, address) and section anchors
├─ content/home.ts             All homepage copy and image references — edit content here
├─ hooks/                      Client hooks (active-section tracking)
└─ lib/                        Utilities (class merging, WhatsApp/phone links, contact delivery)
```

**Editing content:** copy, cards, testimonials, FAQs and images live in `src/content/home.ts`; business
details (phone, WhatsApp, email, address, socials) live in `src/config/site.ts`.

## Configuration

See `.env.example`.

- `NEXT_PUBLIC_SITE_URL` — production URL (canonical URLs, sitemap, Open Graph).
- **Contact form delivery** — set **one** of:
  - `RESEND_API_KEY` + `CONTACT_FROM_EMAIL` + `CONTACT_TO_EMAIL` (email via [Resend](https://resend.com)), or
  - `CONTACT_WEBHOOK_URL` (JSON POST to Zapier / Make / Google Apps Script / a CRM).

  Without either, submissions are logged to the server console in development, and in production the form
  tells the visitor to call or WhatsApp instead — no enquiry is silently dropped.

- `NEXT_PUBLIC_SOLAR_TOUR_VIDEO_URL` — optional YouTube/Vimeo **embed** URL for the "video tour" play
  button. Without it the button is a decorative accent.

## Behaviour notes

- **Navigation** — in-page anchors with a sticky header; the active nav item follows the section being read.
- **"Solar range" showcase** — on desktop the section pins while you scroll through Solar Panels → Inverters →
  Batteries (matching the three Figma variants); on tablets/phones it becomes stacked cards.
- **Testimonials** — looping carousel: autoplays (pauses on hover/focus/off-screen), swipeable, keyboard
  accessible, with the centre card highlighted as in the design.
- **Enquiry CTAs** ("Get Price & Availability", FAQ rows, "Talk to a Solar Expert") open WhatsApp with a
  pre-filled message.
- **Accessibility** — skip link, semantic landmarks/headings, labelled controls, visible focus styles,
  `prefers-reduced-motion` respected throughout.

## Deployment

The homepage is statically prerendered, so it deploys anywhere Next.js runs (Vercel recommended; `next start`
behind a CDN also works). Set the environment variables above in the hosting dashboard.
Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) are set in `next.config.ts`.

## Open items

- Product/brand "View … Products" buttons point to the on-page catalogue until the Products page is built —
  update `productLinks` in `src/config/navigation.ts` when it exists.
- Social profile URLs are not in the design; add them to `siteConfig.socials` and the footer icons appear.
- A few source photos in the Figma file are low-resolution (e.g. the institutional-installation and
  "Why choose us" images); replace them in `src/assets/images` with higher-resolution originals when available.
