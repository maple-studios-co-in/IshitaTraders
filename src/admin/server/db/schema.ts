import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { FileRef, ImageRef } from "@/admin/content/images";
import type {
  EnquiryField,
  EnquiryStatus,
  LeadEventType,
  MessageChannel,
  MessageDirection,
  MessageSource,
  MessageStatus,
  PageStatus,
  ProductSpec,
  Role,
  StockStatus,
  TestimonialBadge,
  Utm,
} from "@/admin/content/types";

/* --------------------------------------------------------------- helpers */

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------- people & access */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").$type<Role>().notNull().default("editor"),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** One row per signed-in browser. `id` is the SHA-256 of the cookie token, never the token itself. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Fixed-window counters for login, form and webhook throttling. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/* ----------------------------------------------------------------- media */

export const media = pgTable(
  "media",
  {
    id: id(),
    kind: text("kind").$type<"image" | "document">().notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    blurDataUrl: text("blur_data_url"),
    alt: text("alt").notNull().default(""),
    storage: text("storage").$type<"database" | "blob">().notNull(),
    /** Public URL: `/media/<id>/<name>` for database storage, the CDN URL for Vercel Blob. */
    url: text("url").notNull(),
    checksum: text("checksum").notNull(),
    createdAt: createdAt(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);

/** Bytes for database-stored media, kept apart so listing media never loads file contents. */
export const mediaBlobs = pgTable("media_blobs", {
  mediaId: uuid("media_id")
    .primaryKey()
    .references(() => media.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

/* --------------------------------------------------------------- catalog */

export const brands = pgTable("brands", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Short label used on the catalogue tabs, e.g. "EXIDE Catalogue". */
  tabLabel: text("tab_label").notNull().default(""),
  logo: jsonb("logo").$type<ImageRef | null>(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** The "What We Provide" cards on the homepage. */
export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  label: text("label").notNull().default(""),
  description: text("description").notNull().default(""),
  image: jsonb("image").$type<ImageRef | null>(),
  enquirySubject: text("enquiry_subject").notNull().default(""),
  showOnHomepage: boolean("show_on_homepage").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().default(""),
    name: text("name").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    /** Eyebrow on the card, e.g. "SOLAR INVERTER PCU". */
    typeLabel: text("type_label").notNull().default(""),
    /** The model line under the name, e.g. "Model: IMTT2000 | Heavy Duty Spine". */
    subtitle: text("subtitle").notNull().default(""),
    badge: text("badge").notNull().default(""),
    /** One-liner for compact cards (homepage featured products). */
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    image: jsonb("image").$type<ImageRef | null>(),
    gallery: jsonb("gallery").$type<ImageRef[]>().notNull().default([]),
    specs: jsonb("specs").$type<ProductSpec[]>().notNull().default([]),
    applications: text("applications")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Prices in whole rupees. */
    mrp: integer("mrp"),
    price: integer("price"),
    priceNote: text("price_note").notNull().default(""),
    showPrice: boolean("show_price").notNull().default(false),
    stockStatus: text("stock_status").$type<StockStatus>().notNull().default("in_stock"),
    warranty: text("warranty").notNull().default(""),
    datasheet: jsonb("datasheet").$type<FileRef | null>(),
    isPublished: boolean("is_published").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("products_listing_idx").on(t.isPublished, t.sortOrder),
    index("products_brand_idx").on(t.brandId),
    index("products_category_idx").on(t.categoryId),
  ],
);

/* --------------------------------------------------------------- content */

/** Keyed JSON documents (business profile, hero, SEO…), validated by `content/settings.ts`. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  name: text("name").notNull(),
  location: text("location").notNull().default(""),
  quote: text("quote").notNull(),
  rating: integer("rating").notNull().default(5),
  badgeKind: text("badge_kind").$type<TestimonialBadge>().notNull().default("installation"),
  badgeLabel: text("badge_label").notNull().default(""),
  avatar: jsonb("avatar").$type<ImageRef | null>(),
  isPublished: boolean("is_published").notNull().default(true),
  /** Placeholder cards that must be replaced with real reviews before launch. */
  isSample: boolean("is_sample").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Uploaded HTML documents served at `/<slug>`. */
export const pages = pgTable("pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  html: text("html").notNull(),
  status: text("status").$type<PageStatus>().notNull().default("draft"),
  noindex: boolean("noindex").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const pageVersions = pgTable(
  "page_versions",
  {
    id: id(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    html: text("html").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("page_versions_page_idx").on(t.pageId, t.createdAt)],
);

export const redirects = pgTable("redirects", {
  id: id(),
  source: text("source").notNull().unique(),
  destination: text("destination").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  isActive: boolean("is_active").notNull().default(true),
  hitCount: integer("hit_count").notNull().default(0),
  lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ----------------------------------------------------------------- leads */

/** Every website form submission, tagged with the form it came from. */
export const enquiries = pgTable(
  "enquiries",
  {
    id: id(),
    formKey: text("form_key").notNull(),
    formName: text("form_name").notNull(),
    status: text("status").$type<EnquiryStatus>().notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    company: text("company").notNull().default(""),
    message: text("message").notNull().default(""),
    /** Every submitted field in form order, so the admin sees exactly what the visitor filled. */
    fields: jsonb("fields").$type<EnquiryField[]>().notNull().default([]),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull().default(""),
    pageUrl: text("page_url").notNull().default(""),
    referrer: text("referrer").notNull().default(""),
    utm: jsonb("utm").$type<Utm>().notNull().default({}),
    userAgent: text("user_agent").notNull().default(""),
    ipHash: text("ip_hash").notNull().default(""),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("enquiries_form_idx").on(t.formKey, t.createdAt),
    index("enquiries_status_idx").on(t.status),
    index("enquiries_created_idx").on(t.createdAt),
  ],
);

/** WhatsApp, email, SMS and phone conversations (webhooks + manual logs). */
export const messages = pgTable(
  "messages",
  {
    id: id(),
    channel: text("channel").$type<MessageChannel>().notNull(),
    direction: text("direction").$type<MessageDirection>().notNull().default("inbound"),
    status: text("status").$type<MessageStatus>().notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    contactName: text("contact_name").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    /** Provider message id; makes webhook retries idempotent. */
    externalId: text("external_id"),
    source: text("source").$type<MessageSource>().notNull().default("manual"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("messages_occurred_idx").on(t.occurredAt),
    index("messages_channel_idx").on(t.channel, t.occurredAt),
    uniqueIndex("messages_external_idx")
      .on(t.channel, t.externalId)
      .where(sql`${t.externalId} is not null`),
  ],
);

/** Clicks on WhatsApp / call / email buttons across the site. */
export const leadEvents = pgTable(
  "lead_events",
  {
    id: id(),
    type: text("type").$type<LeadEventType>().notNull(),
    context: text("context").notNull().default(""),
    pagePath: text("page_path").notNull().default(""),
    target: text("target").notNull().default(""),
    message: text("message").notNull().default(""),
    productSlug: text("product_slug").notNull().default(""),
    referrer: text("referrer").notNull().default(""),
    utm: jsonb("utm").$type<Utm>().notNull().default({}),
    userAgent: text("user_agent").notNull().default(""),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("lead_events_created_idx").on(t.createdAt), index("lead_events_type_idx").on(t.type, t.createdAt)],
);

/** Internal notes on enquiries and messages. */
export const notes = pgTable(
  "notes",
  {
    id: id(),
    entityType: text("entity_type").$type<"enquiry" | "message">().notNull(),
    entityId: uuid("entity_id").notNull(),
    body: text("body").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("notes_entity_idx").on(t.entityType, t.entityId)],
);

/* ----------------------------------------------------------------- audit */

export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull().default(""),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull().default(""),
    summary: text("summary").notNull(),
    changes: jsonb("changes").$type<Record<string, { from: unknown; to: unknown }>>().notNull().default({}),
    ip: text("ip").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt), index("activity_entity_idx").on(t.entityType, t.entityId)],
);
