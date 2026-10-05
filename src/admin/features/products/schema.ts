import { z } from "zod";

import { fileRefSchema, imageRefSchema } from "@/admin/content/settings-schema";
import { stockStatuses } from "@/admin/content/types";
import { SLUG_PATTERN } from "@/admin/lib/slug";

import { MAX_HIGHLIGHTED_SPECS } from "./constants";

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);

const rupees = z
  .number({ error: "Enter a whole number of rupees." })
  .int("Use whole rupees.")
  .min(0, "Can’t be negative.")
  .max(100_000_000, "That looks too large.")
  .nullable();

export const specSchema = z.object({
  label: text(60).min(1, "Every spec needs a label."),
  value: text(200).min(1, "Every spec needs a value."),
  highlight: z.boolean(),
});

export const productSchema = z
  .object({
    name: text(140).min(2, "Enter the product name."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(80, "Keep it under 80 characters.")
      .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens, e.g. exide-it500."),
    sku: text(60),
    brandId: z.string().uuid().nullable(),
    categoryId: z.string().uuid().nullable(),
    typeLabel: text(60),
    subtitle: text(160),
    badge: text(40),
    summary: text(240),
    description: text(4000),
    image: imageRefSchema.nullable(),
    gallery: z.array(imageRefSchema).max(12, "Up to 12 gallery images."),
    specs: z
      .array(specSchema)
      .max(40, "Up to 40 specs.")
      .refine(
        (specs) => specs.filter((spec) => spec.highlight).length <= MAX_HIGHLIGHTED_SPECS,
        `Highlight at most ${MAX_HIGHLIGHTED_SPECS} specs.`,
      ),
    applications: z.array(text(40).min(1)).max(20, "Up to 20 applications."),
    mrp: rupees,
    price: rupees,
    priceNote: text(120),
    showPrice: z.boolean(),
    stockStatus: z.enum(stockStatuses),
    warranty: text(80),
    datasheet: fileRefSchema.nullable(),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    seoTitle: text(70),
    seoDescription: text(170),
  })
  .superRefine((value, ctx) => {
    if (value.price !== null && value.mrp !== null && value.price > value.mrp) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "The price is higher than the MRP." });
    }
    if (value.showPrice && value.price === null) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price to show it on the website." });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

/** Quick bulk changes from the products list. */
export const bulkOperations = [
  "publish",
  "hide",
  "feature",
  "unfeature",
  "in_stock",
  "out_of_stock",
  "delete",
] as const;
export type BulkOperation = (typeof bulkOperations)[number];
