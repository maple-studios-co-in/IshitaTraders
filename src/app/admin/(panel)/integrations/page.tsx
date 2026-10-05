import {
  CircleCheck,
  CircleDashed,
  Database,
  HardDrive,
  Mail,
  MailOpen,
  MessageCircle,
  MessageSquareText,
  MousePointerClick,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CopyButton } from "@/admin/components/ui/copy-button";
import { Badge, Callout, Card, CardHeader, PageHeader, Table, TD, TH } from "@/admin/components/ui/primitives";
import { getSiteSettings } from "@/admin/content/settings";
import { getClickVolume, getLastWebhookDeliveries } from "@/admin/features/inbox/queries";
import { databaseHost, publicOrigin } from "@/admin/features/integrations/origin";
import { TestEmailButton } from "@/admin/features/integrations/test-email-button";
import { formatDateTime, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { env } from "@/admin/server/env";
import { isEmailConfigured } from "@/admin/server/notify";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Integrations" };

/* ------------------------------------------------------------ small parts */

type State = "ok" | "warn" | "off";

function Status({ state, children }: { state: State; children: ReactNode }) {
  const Icon = { ok: CircleCheck, warn: TriangleAlert, off: CircleDashed }[state];
  return (
    <Badge tone={state === "ok" ? "leaf" : state === "warn" ? "amber" : "slate"}>
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </Badge>
  );
}

function IntegrationCard({
  id,
  icon: Icon,
  title,
  status,
  description,
  children,
  className,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  status: ReactNode;
  description: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn("flex flex-col rounded-xl border border-slate-200 bg-white shadow-card", className)}
    >
      <header className="flex items-start gap-4 border-b border-slate-100 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-800">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`${id}-title`} className="font-display text-base font-bold text-navy-950">
              {title}
            </h2>
            {status}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-5 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase sm:pt-0.5">{item.label}</dt>
          <dd className="admin-break text-slate-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-leaf-600" aria-hidden="true" />
      ) : (
        <CircleDashed className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
      )}
      <span>
        <span className="sr-only">{ok ? "Done: " : "Missing: "}</span>
        {children}
      </span>
    </li>
  );
}

function UrlField({ label, url, copyLabel }: { label: string; url: string; copyLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <code className="admin-break min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
          {url}
        </code>
        <CopyButton value={url} label={copyLabel} variant="secondary" absolute={false} />
      </div>
    </div>
  );
}

function Steps({ title = "How to set it up", children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-navy-900 hover:text-brand-600">
        {title}
      </summary>
      <div className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-700 [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-navy-950 [&_h3:first-child]:mt-0 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p+ol]:mt-1.5">
        {children}
      </div>
    </details>
  );
}

const Env = ({ children }: { children: string }) => (
  <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-navy-900">{children}</code>
);

function lastSeen(date: Date | null) {
  if (!date) return <span className="text-slate-500">Nothing received yet</span>;
  return (
    <time dateTime={date.toISOString()} title={formatDateTime(date)}>
      {timeAgo(date)}
    </time>
  );
}

const isSet = (name: string) => Boolean(process.env[name]?.trim());

const ENV_VARS: { name: string; purpose: string; required?: boolean }[] = [
  {
    name: "NEXT_PUBLIC_SITE_URL",
    purpose: "Public address of the site (canonical links, sitemap, the webhook URLs on this page).",
    required: true,
  },
  {
    name: "AUTH_SECRET",
    purpose: "Long random value used to hash visitor IPs and other fingerprints.",
    required: true,
  },
  { name: "DATABASE_URL", purpose: "PostgreSQL connection string (Neon recommended).", required: true },
  {
    name: "BLOB_READ_WRITE_TOKEN",
    purpose: "Vercel Blob storage for uploads (optional; added when you connect a Blob store).",
  },
  { name: "RESEND_API_KEY", purpose: "Resend API key for notification emails." },
  {
    name: "CONTACT_FROM_EMAIL",
    purpose: "Sender, e.g. Ishita Traders Website <website@your-domain.com> (domain verified in Resend).",
  },
  { name: "CONTACT_TO_EMAIL", purpose: "Fallback recipients when no notification address is saved in the admin." },
  {
    name: "CONTACT_WEBHOOK_URL",
    purpose: "Optional: also POST each new enquiry to Zapier, Make, Google Apps Script or a CRM.",
  },
  { name: "WHATSAPP_VERIFY_TOKEN", purpose: "Any long random string; typed into Meta’s webhook settings too." },
  {
    name: "WHATSAPP_APP_SECRET",
    purpose: "Meta app secret (App settings → Basic); verifies that webhooks really come from Meta.",
  },
  { name: "INBOUND_EMAIL_SECRET", purpose: "Shared secret your email provider sends with every inbound email." },
  { name: "SMS_WEBHOOK_SECRET", purpose: "Shared secret your SMS / call provider sends with every event." },
];

/* ------------------------------------------------------------------- page */

export default async function IntegrationsPage() {
  await requirePermission("integrations:manage");
  const [origin, settings, deliveries, clicks] = await Promise.all([
    publicOrigin(),
    getSiteSettings(),
    getLastWebhookDeliveries(),
    getClickVolume(),
  ]);

  const emailReady = isEmailConfigured();
  const recipients = (
    settings.notifications.enquiryEmails.length > 0
      ? settings.notifications.enquiryEmails
      : env.contactToEmail.split(",")
  )
    .map((email) => email.trim())
    .filter(Boolean);
  const whatsapp = { token: Boolean(env.whatsappVerifyToken), secret: Boolean(env.whatsappAppSecret) };
  const dbHost = env.databaseUrl ? databaseHost(env.databaseUrl) : "";
  const urls = {
    whatsapp: `${origin}/api/webhooks/whatsapp`,
    email: `${origin}/api/webhooks/email`,
    sms: `${origin}/api/webhooks/sms`,
  };

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect WhatsApp, email and SMS to the inbox, and check the services the website depends on. Secrets are set as environment variables and are never shown here."
        breadcrumbs={[{ label: "Administration" }, { label: "Integrations" }]}
      />

      {!env.isProduction ? (
        <Callout tone="info" className="mb-6" title="Development mode">
          Webhook URLs below use this computer’s address ({origin}). Providers need a public HTTPS URL — use the live
          site’s address, or a tunnel (e.g. ngrok) while testing.
        </Callout>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <IntegrationCard
          id="whatsapp"
          icon={MessageCircle}
          title="WhatsApp Cloud API"
          status={
            whatsapp.token && whatsapp.secret ? (
              <Status state="ok">Configured</Status>
            ) : whatsapp.token || whatsapp.secret ? (
              <Status state="warn">Partly configured</Status>
            ) : (
              <Status state="off">Not configured</Status>
            )
          }
          description="Messages sent to the business WhatsApp number arrive in Inbox → WhatsApp."
        >
          <UrlField label="Callback URL" url={urls.whatsapp} copyLabel="Copy URL" />
          <ul className="flex flex-col gap-1.5">
            <CheckItem ok={whatsapp.token}>
              Verify token (<Env>WHATSAPP_VERIFY_TOKEN</Env>) {whatsapp.token ? "is set" : "isn’t set"}
            </CheckItem>
            <CheckItem ok={whatsapp.secret}>
              App secret (<Env>WHATSAPP_APP_SECRET</Env>){" "}
              {whatsapp.secret
                ? "is set — every webhook’s signature is verified"
                : env.isProduction
                  ? "isn’t set — webhooks are rejected until it is"
                  : "isn’t set — unsigned webhooks are accepted in development only"}
            </CheckItem>
          </ul>
          <Facts items={[{ label: "Last message", value: lastSeen(deliveries.whatsapp) }]} />
          <Steps>
            <ol>
              <li>
                Open <span className="font-semibold">developers.facebook.com → My Apps → Create app</span> (type
                “Business”) and add the <span className="font-semibold">WhatsApp</span> product, connected to the
                business’s WhatsApp Business Account and phone number.
              </li>
              <li>
                In <span className="font-semibold">App settings → Basic</span>, copy the App secret into{" "}
                <Env>WHATSAPP_APP_SECRET</Env>.
              </li>
              <li>
                Make up a long random verify token (e.g. <Env>openssl rand -hex 32</Env>) and set it as{" "}
                <Env>WHATSAPP_VERIFY_TOKEN</Env>. Redeploy.
              </li>
              <li>
                In <span className="font-semibold">WhatsApp → Configuration → Webhook → Edit</span>, paste the callback
                URL above and the same verify token, then <span className="font-semibold">Verify and save</span>.
              </li>
              <li>
                Under <span className="font-semibold">Webhook fields</span>, subscribe to <Env>messages</Env>.
              </li>
              <li>Send a WhatsApp message to the business number — it shows up in the inbox within seconds.</li>
            </ol>
            <p className="mt-2 text-xs text-slate-500">
              Replies are still sent from WhatsApp (Business app or Meta Business Suite); the inbox records what
              customers send. Photos and documents stay in WhatsApp — the inbox notes their type, caption and file name.
            </p>
          </Steps>
        </IntegrationCard>

        <IntegrationCard
          id="email-in"
          icon={MailOpen}
          title="Inbound email"
          status={
            env.inboundEmailSecret ? (
              <Status state="ok">Configured</Status>
            ) : (
              <Status state="off">Not configured</Status>
            )
          }
          description="Emails to your enquiry address arrive in Inbox → Email (via Postmark, CloudMailin or a Cloudflare Email Worker)."
        >
          <UrlField label="Webhook URL" url={urls.email} copyLabel="Copy URL" />
          <ul className="flex flex-col gap-1.5">
            <CheckItem ok={Boolean(env.inboundEmailSecret)}>
              Shared secret (<Env>INBOUND_EMAIL_SECRET</Env>){" "}
              {env.inboundEmailSecret ? "is set" : "isn’t set — inbound email is refused until it is"}
            </CheckItem>
          </ul>
          <div>
            <p className="font-semibold text-slate-800">Send the secret in one of these ways</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Header <Env>{"Authorization: Bearer <INBOUND_EMAIL_SECRET>"}</Env> (best)
              </li>
              <li>
                Basic auth in the URL: <Env>{urls.email.replace(/^(https?:\/\/)/, "$1inbox:<secret>@")}</Env>
              </li>
              <li>
                Query string <Env>{"?secret=<secret>"}</Env> (last resort: URLs end up in logs)
              </li>
            </ul>
          </div>
          <Facts items={[{ label: "Last email", value: lastSeen(deliveries.email) }]} />
          <Steps>
            <h3>Postmark</h3>
            <ol>
              <li>
                Create a server → Inbound stream; forward your enquiry address to its inbound address (or point an MX
                record at Postmark).
              </li>
              <li>
                Set the inbound webhook URL to the basic-auth form above and save. Postmark retries automatically if the
                site is down.
              </li>
            </ol>
            <h3>CloudMailin</h3>
            <ol>
              <li>
                Create an address, choose the <span className="font-semibold">JSON (Normalized)</span> format and set
                the target to the basic-auth URL above.
              </li>
            </ol>
            <h3>Cloudflare Email Routing (free)</h3>
            <ol>
              <li>
                Create an Email Worker that parses the message (e.g. with <Env>postal-mime</Env>) and POSTs JSON{" "}
                <Env>{"{ from, fromName, to, subject, text, html, messageId, date }"}</Env> to the webhook URL with the
                Bearer header; keep <Env>message.forward()</Env> so the mailbox still gets a copy.
              </li>
              <li>Route your enquiry address to that Worker.</li>
            </ol>
          </Steps>
        </IntegrationCard>

        <IntegrationCard
          id="sms"
          icon={MessageSquareText}
          title="SMS and phone calls"
          status={
            env.smsWebhookSecret ? <Status state="ok">Configured</Status> : <Status state="off">Not configured</Status>
          }
          description="Text messages and missed-call alerts from Twilio, Exotel, MSG91 or an IVR arrive in Inbox → SMS / Calls."
        >
          <UrlField label="Webhook URL" url={urls.sms} copyLabel="Copy URL" />
          <ul className="flex flex-col gap-1.5">
            <CheckItem ok={Boolean(env.smsWebhookSecret)}>
              Shared secret (<Env>SMS_WEBHOOK_SECRET</Env>){" "}
              {env.smsWebhookSecret ? "is set" : "isn’t set — events are refused until it is"}
            </CheckItem>
          </ul>
          <p>
            Authenticate with <Env>{"Authorization: Bearer <SMS_WEBHOOK_SECRET>"}</Env>, or — for providers that only
            take a URL — append <Env>{"?secret=<SMS_WEBHOOK_SECRET>"}</Env>.
          </p>
          <Facts items={[{ label: "Last SMS / call", value: lastSeen(deliveries.sms) }]} />
          <Steps>
            <h3>Twilio</h3>
            <ol>
              <li>
                Phone Numbers → Active numbers → your number →{" "}
                <span className="font-semibold">Messaging: “A message comes in”</span> → Webhook, the URL above with{" "}
                <Env>{"?secret=…"}</Env>, HTTP POST.
              </li>
              <li>
                Optional: <span className="font-semibold">Voice: “A call comes in”</span> to the same URL logs every
                call in Inbox → Calls.
              </li>
            </ol>
            <h3>Exotel, MSG91 and IVR missed-call services</h3>
            <ol>
              <li>
                Add an inbound SMS / missed-call webhook (POST) to the URL above. Form fields <Env>From</Env> and{" "}
                <Env>Body</Env> work, as does JSON <Env>{'{"from": "+9198…", "body": "…"}'}</Env>.
              </li>
              <li>
                For missed calls send <Env>{'{"from": "+9198…", "type": "call", "status": "missed"}'}</Env> (optional{" "}
                <Env>duration</Env> in seconds and <Env>id</Env> to ignore retries).
              </li>
            </ol>
          </Steps>
        </IntegrationCard>

        <IntegrationCard
          id="email-out"
          icon={Mail}
          title="Email notifications"
          status={emailReady ? <Status state="ok">Configured</Status> : <Status state="off">Not configured</Status>}
          description="New enquiries (and, if switched on, new inbox messages) are emailed to the team through Resend."
        >
          <Facts
            items={[
              { label: "Provider", value: "Resend" },
              { label: "Sender", value: env.contactFromEmail || <span className="text-slate-500">Not set</span> },
              {
                label: "Recipients",
                value: recipients.length ? recipients.join(", ") : <span className="text-slate-500">None</span>,
              },
              {
                label: "Inbox emails",
                value: settings.notifications.messageEmails
                  ? "On — new WhatsApp/email/SMS messages are emailed"
                  : "Off (switch on under Site content → Notifications)",
              },
            ]}
          />
          <TestEmailButton />
          <Steps>
            <ol>
              <li>Create a Resend account and verify your domain (it gives you DNS records to add).</li>
              <li>
                Create an API key with sending access → <Env>RESEND_API_KEY</Env>.
              </li>
              <li>
                Set <Env>CONTACT_FROM_EMAIL</Env> to a sender on the verified domain, e.g.{" "}
                <Env>{"Ishita Traders Website <website@your-domain.com>"}</Env>.
              </li>
              <li>Redeploy, then press “Send test email”.</li>
            </ol>
          </Steps>
        </IntegrationCard>

        <IntegrationCard
          id="clicks"
          icon={MousePointerClick}
          title="Click tracking"
          status={<Status state="ok">Active</Status>}
          description="Built in: clicks on WhatsApp, call and email buttons, with the section, product, pre-filled message and UTM source. No cookies; IP addresses are only kept as a salted hash."
        >
          <Facts
            items={[
              { label: "Last 24 hours", value: `${clicks.last24h.toLocaleString("en-IN")} clicks` },
              { label: "Last 7 days", value: `${clicks.last7d.toLocaleString("en-IN")} clicks` },
            ]}
          />
          <p>
            <Link href="/admin/inbox?tab=clicks" className="font-semibold text-brand-600 hover:underline">
              Open Inbox → Contact clicks
            </Link>
          </p>
        </IntegrationCard>

        <IntegrationCard
          id="database"
          icon={Database}
          title="Database"
          status={
            env.databaseUrl ? (
              <Status state="ok">PostgreSQL</Status>
            ) : (
              <Status state={env.isProduction ? "warn" : "off"}>Embedded (local)</Status>
            )
          }
          description="Products, enquiries, messages, settings and the audit trail."
        >
          <Facts
            items={
              env.databaseUrl
                ? [
                    { label: "Driver", value: "PostgreSQL (postgres.js) via DATABASE_URL" },
                    { label: "Host", value: dbHost || "—" },
                  ]
                : [
                    { label: "Driver", value: "PGlite — embedded PostgreSQL for local development" },
                    { label: "Location", value: "This computer only; not used in production" },
                  ]
            }
          />
          <Steps>
            <ol>
              <li>
                Create a PostgreSQL database — easiest is <span className="font-semibold">Vercel → Storage → Neon</span>
                , connected to this project.
              </li>
              <li>
                Use the <span className="font-semibold">pooled</span> connection string as <Env>DATABASE_URL</Env>{" "}
                (Production and Preview).
              </li>
              <li>Redeploy. Tables are created automatically on first start.</li>
            </ol>
          </Steps>
        </IntegrationCard>

        <IntegrationCard
          id="storage"
          icon={HardDrive}
          title="File storage"
          status={
            env.blobToken ? <Status state="ok">Vercel Blob</Status> : <Status state="off">In the database</Status>
          }
          description="Uploaded product images, logos and PDF datasheets."
        >
          <Facts
            items={[
              {
                label: "Where",
                value: env.blobToken
                  ? "Vercel Blob (served from a CDN)"
                  : "The database — fine for a small catalogue; Vercel Blob is faster for many images",
              },
            ]}
          />
          <Steps>
            <ol>
              <li>
                In Vercel, open <span className="font-semibold">Storage → Create → Blob</span> and connect it to this
                project (this adds <Env>BLOB_READ_WRITE_TOKEN</Env>).
              </li>
              <li>Redeploy. New uploads go to Blob; files already uploaded keep working.</li>
            </ol>
          </Steps>
        </IntegrationCard>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Environment variables"
          description="Set these in Vercel → Project → Settings → Environment Variables (Production and Preview), then redeploy. Only whether each is set is shown — never its value."
        />
        <Table>
          <thead>
            <tr>
              <TH>Variable</TH>
              <TH>What it’s for</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {ENV_VARS.map((item) => {
              const set = isSet(item.name);
              return (
                <tr key={item.name}>
                  <TD className="whitespace-nowrap">
                    <Env>{item.name}</Env>
                  </TD>
                  <TD className="text-sm text-slate-600">{item.purpose}</TD>
                  <TD className="whitespace-nowrap">
                    {set ? (
                      <Status state="ok">Set</Status>
                    ) : item.required && env.isProduction ? (
                      <Status state="warn">Missing</Status>
                    ) : (
                      <Status state="off">Not set</Status>
                    )}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
