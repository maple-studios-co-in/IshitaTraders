/** What the enquiry endpoints accept. Messages and limits match the website's own forms. */
import { z } from "zod";

import { slug } from "../catalog/catalog.schemas.js";

/** Same rule as the website: an Indian mobile number, with or without +91 / 0 in front. */
const INDIAN_MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;

/** The workflow states the admin uses (src/admin/content/types.ts). */
export const ENQUIRY_STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"];

const blankAsMissing = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optionalText = (max) => z.preprocess(blankAsMissing, z.string().trim().max(max).optional());

export const createEnquiryBody = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(160, "That name is too long."),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Please enter a valid 10-digit mobile number.")),
  email: z.preprocess(
    blankAsMissing,
    z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "That email address is too long.")
      .pipe(z.email("Please enter a valid email address."))
      .optional(),
  ),
  company: optionalText(200),
  /** What the enquiry is about, e.g. "Solar", "Battery", "Bulk Supply". */
  subject: optionalText(120),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more (at least 10 characters).")
    .max(4000, "Please keep your message under 4000 characters."),
  /** The product the visitor asked about, if any (its catalogue slug). */
  productSlug: z.preprocess(blankAsMissing, slug.optional()),
  pageUrl: z.preprocess(blankAsMissing, z.url().max(500).optional()),
  utm: z
    .object({
      source: optionalText(100),
      medium: optionalText(100),
      campaign: optionalText(100),
      term: optionalText(100),
      content: optionalText(100),
    })
    .optional(),
  /** Honeypot: hidden from people, so only bots fill it in. */
  website: z.string().max(200).optional(),
});

export const enquiryIdParams = z.object({ id: z.uuid("That is not a valid enquiry id.") });

export const adminListQuery = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  form: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  unread: z
    .enum(["true", "false", "1", "0"])
    .transform((value) => value === "true" || value === "1")
    .optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateEnquiryBody = z
  .object({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    isRead: z.boolean().optional(),
  })
  .refine((body) => body.status !== undefined || body.isRead !== undefined, {
    message: "Send at least one of: status, isRead.",
  });
