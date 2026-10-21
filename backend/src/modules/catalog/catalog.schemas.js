/** What the catalogue endpoints accept in the URL (path parameters and ?query=values). */
import { z } from "zod";

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and dashes, e.g. exide-invamaster-200ah.");

/** ?category=a,b and ?category=a&category=b both become ["a", "b"]. */
const slugList = z.preprocess(
  (value) => (Array.isArray(value) ? value.join(",") : value),
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(slug).max(10, "Ask for at most 10 categories at once.")),
);

const booleanFlag = z.enum(["true", "false", "1", "0"]).transform((value) => value === "true" || value === "1");

export const slugParams = z.object({ slug });

export const productListQuery = z.object({
  brand: slug.optional(),
  category: slugList.optional(),
  q: z.string().trim().max(100, "Keep the search under 100 characters.").optional(),
  featured: booleanFlag.optional(),
  sort: z.enum(["default", "name", "newest"]).default("default"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
