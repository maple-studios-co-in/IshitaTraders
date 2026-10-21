/** Public FAQ and testimonial endpoints (mounted under /api/v1). */
import { Router } from "express";
import { z } from "zod";

import { publicCache } from "../../middleware/cache-control.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./content.controller.js";

const testimonialQuery = z.object({
  includeSamples: z
    .enum(["true", "false", "1", "0"])
    .transform((value) => value === "true" || value === "1")
    .default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const contentRoutes = Router();

const cached = publicCache(300);

contentRoutes.get("/faqs", cached, controller.listFaqs);
contentRoutes.get("/testimonials", cached, validate({ query: testimonialQuery }), controller.listTestimonials);
