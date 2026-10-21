/**
 * Database rows → API objects. The API's shape is a contract with its clients: camelCase fields,
 * prices only where the admin chose to show them, and no internal columns (sort orders, editors,
 * publish flags).
 */
import { file, image } from "../../lib/media.js";

function price(row) {
  if (!row.show_price) return null;
  return { amount: row.price, mrp: row.mrp, currency: "INR", note: row.price_note };
}

export function toProductSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    brand: row.brand_slug ? { slug: row.brand_slug, name: row.brand_name } : null,
    category: row.category_slug ? { slug: row.category_slug, name: row.category_name } : null,
    typeLabel: row.type_label,
    subtitle: row.subtitle,
    badge: row.badge,
    summary: row.summary,
    image: image(row.image),
    applications: row.applications,
    price: price(row),
    stockStatus: row.stock_status,
    warranty: row.warranty,
    isFeatured: row.is_featured,
    updatedAt: row.updated_at,
  };
}

export function toProductDetail(row) {
  return {
    ...toProductSummary(row),
    description: row.description,
    gallery: (row.gallery ?? []).map(image),
    specs: row.specs,
    datasheet: file(row.datasheet),
    seo: { title: row.seo_title, description: row.seo_description },
  };
}

export function toBrand(row) {
  return {
    slug: row.slug,
    name: row.name,
    tabLabel: row.tab_label || `${row.name} Catalogue`,
    logo: image(row.logo),
    productCount: row.product_count,
  };
}

export function toCategory(row) {
  return {
    slug: row.slug,
    name: row.name,
    label: row.label,
    description: row.description,
    image: image(row.image),
    enquirySubject: row.enquiry_subject || row.name.toLowerCase(),
    showOnHomepage: row.show_on_homepage,
    productCount: row.product_count,
  };
}
