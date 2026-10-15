/** Client-safe enquiry form rules, shared by the form and the server action (no validation library in the browser bundle). */
export const enquiryLimits = { name: 80, phone: 20, interest: 80, message: 1500 } as const;

/** Indian mobile numbers, with or without +91 / 0 in front. */
export const INDIAN_MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;

/** Spaces, brackets and dashes people type inside phone numbers. */
export const normalizePhone = (value: string) => value.trim().replace(/[\s()-]/g, "");

/** Hidden honeypot input name; real visitors never fill it. */
export const HONEYPOT_FIELD = "company_website";
