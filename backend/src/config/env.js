/**
 * Application settings, read once from process.env (filled from .env in development, by the host in
 * production), checked with zod and exported as one frozen object. Anything invalid stops the process
 * at startup with a readable message ("fail fast") instead of failing later, mid-request.
 */
import { z } from "zod";

/** Treats `KEY=` (present but empty) the same as a missing key. */
const blankAsMissing = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const optional = (schema) => z.preprocess(blankAsMissing, schema.optional());

const integer = (min, max, fallback) =>
  z.preprocess(blankAsMissing, z.coerce.number().int().min(min).max(max).default(fallback));

/** "a, b,c" -> ["a", "b", "c"], each item checked by `item`. */
const list = (item) =>
  z.preprocess(
    blankAsMissing,
    z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      )
      .pipe(z.array(item)),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: optional(z.string()),
    PORT: integer(1, 65535, 4000),
    /** Proxy hops in front of the API (1 on Render/Railway/Heroku), so req.ip is the visitor's address. */
    TRUST_PROXY: integer(0, 10, 0),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_POOL_MAX: integer(1, 100, 10),

    /** Websites allowed to call the API from a browser. */
    CORS_ORIGINS: list(z.url()),
    /** The website's address, to turn uploaded-media paths into full URLs. */
    PUBLIC_SITE_URL: optional(z.url()),

    /** Secret for hashing visitor IPs. Set it to the website's AUTH_SECRET so both hash alike. */
    IP_HASH_SECRET: optional(z.string().min(16, "Use at least 16 characters.")),
    API_RATE_LIMIT: integer(1, 100_000, 300),
    ENQUIRY_RATE_LIMIT: integer(1, 1000, 5),
    ENQUIRY_RATE_WINDOW_MINUTES: integer(1, 1440, 10),

    /** Enables /api/v1/admin/* when set (Authorization: Bearer <key>). */
    ADMIN_API_KEY: optional(z.string().min(32, "Use at least 32 random characters.")),
    ENQUIRY_WEBHOOK_URL: optional(z.url({ protocol: /^https?$/ })),
    ENQUIRY_WEBHOOK_SECRET: optional(z.string().min(16, "Use at least 16 characters.")),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV === "production" && !values.IP_HASH_SECRET) {
      ctx.addIssue({ code: "custom", path: ["IP_HASH_SECRET"], message: "Required in production." });
    }
  })
  .transform((values) => ({
    ...values,
    // Containers and hosts need every interface; on a laptop, only this machine.
    HOST: values.HOST ?? (values.NODE_ENV === "production" ? "0.0.0.0" : "localhost"),
    IP_HASH_SECRET: values.IP_HASH_SECRET ?? "development-only-ip-hash-secret",
    isProduction: values.NODE_ENV === "production",
    isTest: values.NODE_ENV === "test",
  }));

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment settings:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
