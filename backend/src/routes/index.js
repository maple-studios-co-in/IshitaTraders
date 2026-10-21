/**
 * Version 1 of the API, mounted at /api/v1. A future breaking change ships as /api/v2 next to it,
 * so existing clients keep working.
 */
import { Router } from "express";

import { env } from "../config/env.js";
import { publicCache } from "../middleware/cache-control.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { catalogRoutes } from "../modules/catalog/catalog.routes.js";
import { contentRoutes } from "../modules/content/content.routes.js";
import { adminEnquiryRoutes, publicEnquiryRoutes } from "../modules/enquiries/enquiries.routes.js";

export const apiRouter = Router();

/** A small index, so a client (or a person in a browser) can discover what's here. */
apiRouter.get("/", publicCache(300), (_req, res) => {
  res.json({
    name: "Ishita Traders API",
    version: "v1",
    endpoints: {
      brands: "/api/v1/brands",
      categories: "/api/v1/categories",
      products: "/api/v1/products",
      faqs: "/api/v1/faqs",
      testimonials: "/api/v1/testimonials",
      enquiries: "POST /api/v1/enquiries",
    },
  });
});

apiRouter.use(catalogRoutes);
apiRouter.use(contentRoutes);
apiRouter.use(publicEnquiryRoutes);

// Without a key configured the admin endpoints don't exist at all (plain 404, nothing to probe).
if (env.ADMIN_API_KEY) {
  apiRouter.use("/admin", requireApiKey, adminEnquiryRoutes);
}
