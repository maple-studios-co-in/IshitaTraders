import "server-only";

import os from "node:os";
import path from "node:path";

const read = (name: string) => process.env[name]?.trim() ?? "";

let warnedAuthSecret = false;

/**
 * Typed access to environment configuration. Read lazily (getters) so tests and the dev server
 * always see the current values. Secrets never leave the server.
 */
export const env = {
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  /** Embedded database location for local development (outside OneDrive/Dropbox-synced folders). */
  get localDataDir() {
    return read("LOCAL_DATA_DIR") || path.join(os.homedir(), ".ishita-traders");
  },
  get isVercel() {
    return Boolean(process.env.VERCEL);
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isBuild() {
    return process.env.NEXT_PHASE === "phase-production-build";
  },
  get blobToken() {
    return read("BLOB_READ_WRITE_TOKEN");
  },
  /** First owner account, created on the first sign-in when the users table is empty. */
  get adminEmail() {
    return read("ADMIN_EMAIL").toLowerCase();
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? "";
  },
  get adminName() {
    return read("ADMIN_NAME") || "Owner";
  },
  /** Salt for hashing visitor IPs and other non-reversible fingerprints. */
  get authSecret() {
    const secret = read("AUTH_SECRET");
    if (!secret && this.isProduction && !warnedAuthSecret) {
      warnedAuthSecret = true;
      console.warn("[admin] AUTH_SECRET is not set: using ADMIN_PASSWORD instead. Set a long random AUTH_SECRET.");
    }
    return secret || read("ADMIN_PASSWORD") || "ishita-traders-local-development-secret";
  },
  get hasAuthSecret() {
    return Boolean(read("AUTH_SECRET"));
  },
  /**
   * Proxies in front of the app that append to X-Forwarded-For: 1 on Vercel and Hostinger. Raise it
   * only if another proxy (e.g. a CDN) sits in front of those.
   */
  get trustedProxyHops() {
    const hops = Number.parseInt(read("TRUSTED_PROXY_HOPS"), 10);
    return Number.isInteger(hops) && hops >= 1 && hops <= 5 ? hops : 1;
  },
  /**
   * Optional header the host's proxy sets to the visitor's address (e.g. x-real-ip), used instead of
   * X-Forwarded-For. Only for proxies that overwrite it — a header visitors can set themselves isn't safe.
   */
  get clientIpHeader() {
    return read("CLIENT_IP_HEADER").toLowerCase();
  },
  get resendApiKey() {
    return read("RESEND_API_KEY");
  },
  get contactFromEmail() {
    return read("CONTACT_FROM_EMAIL");
  },
  get contactToEmail() {
    return read("CONTACT_TO_EMAIL");
  },
  get contactWebhookUrl() {
    return read("CONTACT_WEBHOOK_URL");
  },
  get whatsappVerifyToken() {
    return read("WHATSAPP_VERIFY_TOKEN");
  },
  get whatsappAppSecret() {
    return read("WHATSAPP_APP_SECRET");
  },
  get inboundEmailSecret() {
    return read("INBOUND_EMAIL_SECRET");
  },
  get smsWebhookSecret() {
    return read("SMS_WEBHOOK_SECRET");
  },
};
