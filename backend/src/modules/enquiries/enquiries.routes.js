/** Enquiry endpoints: one public (create), three for the admin API key (list, read, update). */
import { Router } from "express";

import { noStore } from "../../middleware/cache-control.js";
import { enquiryLimiter } from "../../middleware/rate-limit.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./enquiries.controller.js";
import { adminListQuery, createEnquiryBody, enquiryIdParams, updateEnquiryBody } from "./enquiries.schemas.js";

/** Mounted under /api/v1. Rate-limited before validation, so invalid floods are counted too. */
export const publicEnquiryRoutes = Router();

publicEnquiryRoutes.post(
  "/enquiries",
  noStore,
  enquiryLimiter,
  validate({ body: createEnquiryBody }),
  controller.create,
);

/** Mounted under /api/v1/admin, behind requireApiKey. */
export const adminEnquiryRoutes = Router();

adminEnquiryRoutes.use(noStore);
adminEnquiryRoutes.get("/enquiries", validate({ query: adminListQuery }), controller.list);
adminEnquiryRoutes.get("/enquiries/:id", validate({ params: enquiryIdParams }), controller.get);
adminEnquiryRoutes.patch(
  "/enquiries/:id",
  validate({ params: enquiryIdParams, body: updateEnquiryBody }),
  controller.update,
);
