/**
 * Domain vocabulary shared by the database schema, the admin UI and the public site.
 * Client-safe: no server imports here.
 */

/* ----------------------------------------------------------------- access */

export const roles = ["owner", "admin", "editor", "viewer"] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const roleDescriptions: Record<Role, string> = {
  owner: "Everything, including users, integrations and backups.",
  admin: "Everything except managing the owner account.",
  editor: "Products, content, pages, enquiries and messages.",
  viewer: "Read-only access to the dashboard, leads and reports.",
};

/* ---------------------------------------------------------------- catalog */

export const stockStatuses = ["in_stock", "low_stock", "on_order", "out_of_stock"] as const;
export type StockStatus = (typeof stockStatuses)[number];

export const stockStatusLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  on_order: "On order",
  out_of_stock: "Out of stock",
};

export interface ProductSpec {
  label: string;
  value: string;
  /** Highlighted specs (up to four) appear on the product card; the rest only in the details view. */
  highlight: boolean;
}

/* ---------------------------------------------------------------- content */

export const testimonialBadges = ["installation", "commercial", "healthcare", "sample"] as const;
export type TestimonialBadge = (typeof testimonialBadges)[number];

export const testimonialBadgeLabels: Record<TestimonialBadge, string> = {
  installation: "Installation (blue)",
  commercial: "Commercial (blue)",
  healthcare: "Healthcare (green)",
  sample: "Sample (grey)",
};

export const pageStatuses = ["draft", "published"] as const;
export type PageStatus = (typeof pageStatuses)[number];

/* ------------------------------------------------------------------ leads */

export const enquiryStatuses = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export const enquiryStatusLabels: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

export interface EnquiryField {
  key: string;
  label: string;
  value: string;
}

export type Utm = Partial<Record<"source" | "medium" | "campaign" | "term" | "content", string>>;

export const messageChannels = ["whatsapp", "email", "sms", "call", "other"] as const;
export type MessageChannel = (typeof messageChannels)[number];

export const messageChannelLabels: Record<MessageChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  call: "Phone call",
  other: "Other",
};

export const messageDirections = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const messageStatuses = ["new", "open", "replied", "closed", "spam"] as const;
export type MessageStatus = (typeof messageStatuses)[number];

export const messageStatusLabels: Record<MessageStatus, string> = {
  new: "New",
  open: "Open",
  replied: "Replied",
  closed: "Closed",
  spam: "Spam",
};

export const messageSources = ["webhook", "manual"] as const;
export type MessageSource = (typeof messageSources)[number];

/** Clicks on contact buttons; logged by the site's click tracker. */
export const leadEventTypes = ["whatsapp", "call", "email"] as const;
export type LeadEventType = (typeof leadEventTypes)[number];

export const leadEventLabels: Record<LeadEventType, string> = {
  whatsapp: "WhatsApp click",
  call: "Call click",
  email: "Email click",
};
