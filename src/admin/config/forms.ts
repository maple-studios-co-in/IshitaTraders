/**
 * Every form on the public website. Submissions are stored with the form's key and name, so the
 * admin always knows which form a lead filled in and where it lives.
 */
export const siteForms = {
  contact: {
    name: "Contact form",
    location: "Homepage → “Let’s Build a Brighter Future Together” section",
    description: "General enquiries: name, email, phone and message.",
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
