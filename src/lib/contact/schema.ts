import "server-only";

import { z } from "zod";

import type { ContactField } from "./types";

const INDIAN_MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name.").max(60, "That name is too long."),
  lastName: z.string().trim().max(60, "That name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email address is too long.")
    .pipe(z.email("Please enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Please enter a valid 10-digit mobile number.")),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more (at least 10 characters).")
    .max(2000, "Please keep your message under 2000 characters."),
}) satisfies z.ZodType<Record<ContactField, string>>;

export type ContactMessage = z.infer<typeof contactSchema>;
