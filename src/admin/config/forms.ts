/**
 * Every form on the public website. Submissions are stored with the form's key and name, so the
 * admin always knows which form a lead filled in and where it lives.
 */
export const siteForms = {
  contact: {
    name: "Contact form",
    location: "Homepage and product pages → “Let’s power your next step.” section",
    description:
      "Name, phone, what they’re interested in and a message. The visitor then sends it to you on WhatsApp; this copy is kept in case they don’t.",
  },
  "product-rfq": {
    name: "Product enquiry / RFQ",
    location: "Products page → product details → “Direct Institutional Enquiry / RFQ”",
    description: "Dealer-price and institutional quotation requests for a specific product.",
  },
} as const;

export type FormKey = keyof typeof siteForms;

export const formKeys = Object.keys(siteForms) as FormKey[];

export const isFormKey = (value: string): value is FormKey => Object.hasOwn(siteForms, value);
