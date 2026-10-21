/**
 * Catalogue request handlers: read the validated input (req.valid), ask the repository, answer with
 * `{ data }` (and `meta` for paginated lists). Express 5 passes thrown errors to the error handler.
 */
import { notFound } from "../../lib/errors.js";
import * as catalog from "./catalog.repository.js";
import { toBrand, toCategory, toProductDetail, toProductSummary } from "./catalog.serializers.js";

export async function listBrands(_req, res) {
  const rows = await catalog.listBrands();
  res.json({ data: rows.map(toBrand) });
}

export async function getBrand(req, res) {
  const row = await catalog.findBrandBySlug(req.valid.params.slug);
  if (!row) throw notFound("No brand with that slug.");
  res.json({ data: toBrand(row) });
}

export async function listCategories(_req, res) {
  const rows = await catalog.listCategories();
  res.json({ data: rows.map(toCategory) });
}

export async function listProducts(req, res) {
  const filters = req.valid.query;
  const { rows, total } = await catalog.listProducts(filters);
  res.json({
    data: rows.map(toProductSummary),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  });
}

export async function getProduct(req, res) {
  const row = await catalog.findProductBySlug(req.valid.params.slug);
  if (!row) throw notFound("No published product with that slug.");
  res.json({ data: toProductDetail(row) });
}
