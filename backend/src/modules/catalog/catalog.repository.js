/**
 * SQL for brands, categories and products. Same visibility rules as the website
 * (src/admin/content/catalog.ts): only published products, only active brands in brand lists,
 * products ordered by their admin sort order, then name.
 */
import { query } from "../../db/pool.js";

const PRODUCT_SUMMARY_COLUMNS = `
  p.id, p.slug, p.sku, p.name, p.type_label, p.subtitle, p.badge, p.summary, p.image, p.applications,
  p.mrp, p.price, p.price_note, p.show_price, p.stock_status, p.warranty, p.is_featured, p.updated_at,
  b.slug AS brand_slug, b.name AS brand_name,
  c.slug AS category_slug, c.name AS category_name`;

const PRODUCT_DETAIL_COLUMNS = `${PRODUCT_SUMMARY_COLUMNS},
  p.description, p.gallery, p.specs, p.datasheet, p.seo_title, p.seo_description`;

const PRODUCT_FROM = `
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id`;

const ORDER_BY = {
  default: "p.sort_order, p.name",
  name: "p.name, p.sort_order",
  newest: "p.created_at DESC, p.name",
};

/** Makes %, _ and \ in a search term literal characters instead of LIKE wildcards. */
const escapeLike = (term) => term.replace(/[\\%_]/g, "\\$&");

/** Builds the WHERE clause for a product listing; values go into `params` as $1, $2 … */
function productFilters({ brand, category, q, featured }) {
  const conditions = ["p.is_published"];
  const params = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (brand) conditions.push(`b.slug = ${param(brand)}`);
  if (category?.length) conditions.push(`c.slug = ANY(${param(category)}::text[])`);
  if (featured !== undefined) conditions.push(`p.is_featured = ${param(featured)}`);

  // Every word must appear somewhere: "exide 150ah" finds products matching both words.
  for (const term of (q ?? "").split(/\s+/).filter(Boolean)) {
    const pattern = param(`%${escapeLike(term)}%`);
    conditions.push(`(
      p.name ILIKE ${pattern} OR p.sku ILIKE ${pattern} OR p.type_label ILIKE ${pattern}
      OR p.subtitle ILIKE ${pattern} OR p.summary ILIKE ${pattern}
      OR b.name ILIKE ${pattern} OR c.name ILIKE ${pattern}
      OR array_to_string(p.applications, ' ') ILIKE ${pattern}
    )`);
  }

  return { where: conditions.join(" AND "), params };
}

/** One page of products plus the total number of matches (for pagination). */
export async function listProducts(filters) {
  const { where, params } = productFilters(filters);
  const offset = (filters.page - 1) * filters.limit;

  const [countResult, pageResult] = await Promise.all([
    query(`SELECT count(*) AS total ${PRODUCT_FROM} WHERE ${where}`, params),
    query(
      `SELECT ${PRODUCT_SUMMARY_COLUMNS} ${PRODUCT_FROM} WHERE ${where}
       ORDER BY ${ORDER_BY[filters.sort]}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function findProductBySlug(slug) {
  const { rows } = await query(
    `SELECT ${PRODUCT_DETAIL_COLUMNS} ${PRODUCT_FROM} WHERE p.slug = $1 AND p.is_published`,
    [slug],
  );
  return rows[0] ?? null;
}

const BRAND_SELECT = `
  SELECT b.id, b.slug, b.name, b.tab_label, b.logo,
         count(p.id) FILTER (WHERE p.is_published) AS product_count
  FROM brands b
  LEFT JOIN products p ON p.brand_id = b.id
  WHERE b.is_active`;

export async function listBrands() {
  const { rows } = await query(`${BRAND_SELECT} GROUP BY b.id ORDER BY b.sort_order, b.name`);
  return rows;
}

export async function findBrandBySlug(slug) {
  const { rows } = await query(`${BRAND_SELECT} AND b.slug = $1 GROUP BY b.id`, [slug]);
  return rows[0] ?? null;
}

export async function listCategories() {
  const { rows } = await query(
    `SELECT c.id, c.slug, c.name, c.label, c.description, c.image, c.enquiry_subject, c.show_on_homepage,
            count(p.id) FILTER (WHERE p.is_published) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order, c.name`,
  );
  return rows;
}
