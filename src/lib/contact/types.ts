/** Client-safe contact form types (no validation library in the browser bundle). */
export const contactFields = ["firstName", "lastName", "email", "phone", "message"] as const;

export type ContactField = (typeof contactFields)[number];

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** Echoed back so the form keeps the visitor's input after a failed submission. */
  values?: Partial<Record<ContactField, string>>;
}

export const initialContactState: ContactFormState = { status: "idle" };

/** Hidden honeypot input name; real visitors never fill it. */
export const HONEYPOT_FIELD = "company_website";
