/** Public catalogue endpoints (mounted under /api/v1). */
import { Router } from "express";

import { publicCache } from "../../middleware/cache-control.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./catalog.controller.js";
import { productListQuery, slugParams } from "./catalog.schemas.js";

export const catalogRoutes = Router();

// Per route, not router.use(): every /api/v1 request passes through this router on its way to the
// others, and only these GETs may be cached.
const cached = publicCache(60);

catalogRoutes.get("/brands", cached, controller.listBrands);
catalogRoutes.get("/brands/:slug", cached, validate({ params: slugParams }), controller.getBrand);
catalogRoutes.get("/categories", cached, controller.listCategories);
catalogRoutes.get("/products", cached, validate({ query: productListQuery }), controller.listProducts);
catalogRoutes.get("/products/:slug", cached, validate({ params: slugParams }), controller.getProduct);
