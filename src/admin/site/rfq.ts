/** Client-safe contract for the product RFQ form (Figma 219:2312 "Direct Institutional Enquiry / RFQ"). */

export const rfqFields = ["company", "contactName", "email", "phone", "quantity", "application"] as const;
export type RfqField = (typeof rfqFields)[number];

export const rfqFieldLabels: Record<RfqField, string> = {
  company: "Company / Institution name",
  contactName: "Contact officer name",
  email: "Commercial email",
  phone: "Direct phone / WhatsApp",
  quantity: "Estimated quantity (units)",
  application: "Target application & delivery depot",
};

export interface RfqFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<RfqField, string>>;
  values?: Partial<Record<RfqField, string>>;
}

export const initialRfqState: RfqFormState = { status: "idle" };

export const RFQ_HONEYPOT = "website_url";
