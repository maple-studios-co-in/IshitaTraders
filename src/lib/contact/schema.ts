import "server-only";

import { z } from "zod";

import { enquiryLimits, INDIAN_MOBILE, normalizePhone } from "./types";

/** The homepage enquiry ("Let’s power your next step."): what the visitor also sends on WhatsApp. */
export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(enquiryLimits.name),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(INDIAN_MOBILE)),
  interest: z.string().trim().max(enquiryLimits.interest),
  message: z.string().trim().max(enquiryLimits.message),
});

export type Enquiry = z.infer<typeof enquirySchema>;
