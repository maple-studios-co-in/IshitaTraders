# Going live on Hostinger

The website and admin run as a **Node.js web app** on a Hostinger **Business** or **Cloud** hosting plan.
The optional API (`backend/`) runs as a second app from the same repository. The database stays on **Neon**
(PostgreSQL); Hostinger's web plans only offer MySQL, and Neon already holds all the admin data.

Hostinger builds Next.js in "standalone" mode on its own. Nothing in the code needs to change for that.
Uploaded images and PDFs are stored in the database, so redeploys never lose them.

## Before you start

- A Hostinger Business or Cloud plan, with the domain added in hPanel.
- Access to the GitHub repository `maple-studios-co-in/IshitaTraders`. Install the Hostinger GitHub App for
  the organisation, so every push to `main` redeploys.
- The Neon connection string: Neon console → **Connect** → the **pooled** connection string.
- Three long random secrets (for example `openssl rand -base64 32`, or a password manager): one each for
  `AUTH_SECRET`, `ADMIN_PASSWORD` and the API's `IP_HASH_SECRET` (that one can simply reuse `AUTH_SECRET`).

## 1. Website and admin

hPanel → **Websites** → **Add website** → **Node.js web app** → **Connect with GitHub** → `IshitaTraders`.

| Setting          | Value                     |
| ---------------- | ------------------------- |
| Framework preset | Next.js                   |
| Branch           | `main`                    |
| Node.js version  | 22                        |
| Root directory   | `/` (the repository root) |
| Build command    | `npm run build`           |
| Output directory | `.next`                   |

**Environment variables.** Add these before the first deploy (or paste them into a file and use **Import .env**).
The build reads `NEXT_PUBLIC_SITE_URL` and stops with a clear message if it is missing.

```dotenv
# The address visitors use, exactly (www or not), no trailing slash.
NEXT_PUBLIC_SITE_URL=https://www.example.com
# Neon pooled connection string. The app checks Neon's TLS certificate (sslmode=verify-full) on its own.
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=verify-full
# Long random value. Never reuse the admin password here.
AUTH_SECRET=
# The owner account's email (the one already used to sign in to the admin).
ADMIN_EMAIL=
ADMIN_NAME=Amit Kumar
# Long random recovery password. Signing in with it resets the owner's password to it; the owner can
# keep signing in with their own password as before.
ADMIN_PASSWORD=

# Optional: email each new enquiry (https://resend.com; FROM must be on a domain verified in Resend).
RESEND_API_KEY=
CONTACT_FROM_EMAIL=Ishita Traders Website <website@example.com>
CONTACT_TO_EMAIL=ishitatraders2014@gmail.com
```

Not needed on Hostinger: `BLOB_READ_WRITE_TOKEN` (uploads live in the database), `ADMIN_SECURE_COOKIES`
(secure by default in production) and `TRUSTED_PROXY_HOPS` (the default, 1, is right unless you put an extra
CDN in front; see Troubleshooting). The inbox integrations (`WHATSAPP_*`, `INBOUND_EMAIL_SECRET`,
`SMS_WEBHOOK_SECRET`) are listed in `.env.example`.

**Deploy**, then follow the build under **Deployments**. When the app shows **Running**:

- **Domain and HTTPS:** attach the domain if the deploy flow didn't, turn on the free SSL certificate and
  **Force HTTPS**. Redirect the other spelling (www or bare) to the one in `NEXT_PUBLIC_SITE_URL`.

## 2. API (optional)

The website does not call the API; it is for future apps and integrations. To run it anyway:
**Add website** → **Node.js web app**, same repository, on a subdomain such as `api.example.com`.

| Setting          | Value           |
| ---------------- | --------------- |
| Framework preset | Express         |
| Branch           | `main`          |
| Node.js version  | 22              |
| Root directory   | `backend`       |
| Entry file       | `src/server.js` |
| Build command    | (leave empty)   |

```dotenv
NODE_ENV=production
DATABASE_URL=(the same Neon URL as the website)
IP_HASH_SECRET=(the website's AUTH_SECRET)
CORS_ORIGINS=https://www.example.com,https://example.com
PUBLIC_SITE_URL=https://www.example.com
TRUST_PROXY=1
```

Check it at `https://api.example.com/health/ready`. It should answer `{"status":"ok", ...}`.

## 3. Ten-minute check after the first deploy

1. `https://www.example.com/sitemap.xml` and `/robots.txt` list **your domain** (not localhost or vercel.app).
2. Sign in at `/admin`. In the dashboard's **Go-live checklist**, "Website address set" and
   "Private AUTH_SECRET set" are ticked.
3. Change something small (for example a product's price). The public page shows it after a reload. If it
   doesn't, Hostinger's CDN is caching pages: purge the cache, or turn the CDN off for this site.
4. Send the contact form once; it appears under **Enquiries**.
5. Upload an image under **Media library**; it shows in the library.
6. **Your account** → active sessions: yours shows **your own public IP** (search "what is my IP"). If every
   session shows a private address (127.0.0.1, 10.x, 172.16–31.x, 192.168.x), see Troubleshooting: spam and
   sign-in limits need the real address.

## 4. Content to finish in the admin

- **Testimonials** → **Hide all samples**: 22 placeholder "Sample review" cards are still published.
- **FAQs**: the website now shows only answered questions. Paste the answers from the appendix below
  (or your own).
- **Products**: these share another product's photo; upload their real photos: Exide Solar Tubelite C10,
  Exide Integra Pure Sinewave UPS, UTL Alpha+ 3kVA, UTL Shamsi 875VA, UTL UST 1536, Microtek Solar SS 3000,
  Microtek MAX 10kVA, Microtek SMU 40A.
- **Site content → Social links**, **SEO** (Search Console code, GA4 ID, then run the audit), and
  **Integrations** for enquiry email alerts.
- The **hero film frames** (`public/sequences/hero-v2`) are FAERS reference footage: license them or replace
  them with Ishita's own film before announcing the site.

## 5. Switching over

- Once the Hostinger site works on the domain, **pause or delete the Vercel projects** (`ishita-traders`,
  `ishita-traders-api`). Both deployments use the same Neon database, but each only refreshes its own pages
  after an edit, so a second live copy can show old content for up to an hour.
- Point the webhook URLs (WhatsApp / Meta, inbound email, SMS) to the new domain. **Integrations** lists them.

## Troubleshooting

| Symptom                                            | Fix                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Build stops with "NEXT_PUBLIC_SITE_URL is not set" | Add it (full `https://` address) and redeploy.                                                           |
| Build is green but the app keeps restarting        | **Runtime logs**: usually `DATABASE_URL` missing or mistyped.                                            |
| `/admin/login` says the database isn't reachable   | Check `DATABASE_URL`; the server log has the details.                                                    |
| Signed out straight after signing in               | Open the site over `https://` (turn on Force HTTPS).                                                     |
| Forms fail on one spelling of the domain           | `NEXT_PUBLIC_SITE_URL` must be the address visitors use; redirect the other one.                         |
| Every visitor gets "too many attempts"             | An extra proxy/CDN sits in front: set `TRUSTED_PROXY_HOPS=2` (website) and `TRUST_PROXY=2` (API).        |
| Sessions all show a private IP (check 6)           | Ask Hostinger which header carries the visitor's IP and set `CLIENT_IP_HEADER` to it (e.g. `x-real-ip`). |
| First visit after a quiet period is slow           | Normal: Hostinger stops idle apps and Neon pauses idle databases; both wake on the next visit.           |

## Appendix: FAQ answers

Written only from facts already on the website; check them, especially the last sentence of the fourth.

**What is the estimated budget required for installing a solar project?**
It depends on the system size (in kW), whether you choose an on-grid, off-grid or hybrid system, how much
battery backup you need, and your roof or site. Share your monthly electricity bill and the appliances you
want to run, and we will recommend the right capacity and send you an itemised quotation. For homes, we also
prepare the paperwork for the PM Surya Ghar Muft Bijli Yojana rooftop solar subsidy, and we can guide
businesses on MSME solar financing options.

**What is the warranty period for the solar panels?**
UTL solar panels carry a 25-year performance warranty from the manufacturer. The exact product warranty
depends on the panel model you choose, and we share the warranty terms with your quotation. Solar inverters
and batteries have their own manufacturer warranties — for example, up to 66 months on Exide batteries. We
supply only genuine, factory-fresh stock with valid manufacturer warranties.

**Which areas do you provide services in, and which solar brands do you install?**
We are based in Chakia, East Champaran, and serve homes, businesses and institutions across Bihar. Delivery
and rooftop installation are available in Chakia and Motihari; for other locations, call us to confirm. We
are an authorised distributor of UTL Solar, Exide and Microtek, and supply and install solar panels, solar
inverters, inverter batteries, online UPS systems and complete rooftop solar systems.

**Where is your office located, and do you charge for home visits?**
Our office is in Chakia, East Champaran, Bihar – 845412. To arrange a home or site visit, call us on
7352405030 and we will fix a convenient time; any visit charge is confirmed when you book.
