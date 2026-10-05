import { listAdminProducts } from "@/admin/features/products/queries";
import { csvResponse, datedFileName, toCsv } from "@/admin/lib/csv";
import { AuthError, assertPermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { products } from "@/admin/server/db/schema";
import { stockStatusLabels } from "@/admin/content/types";
import { siteConfig } from "@/config/site";

/** All products as a spreadsheet (for price lists, stock checks and backups). */
export async function GET() {
  try {
    await assertPermission("products:read");
  } catch (error) {
    if (error instanceof AuthError) return new Response(error.message, { status: 401 });
    throw error;
  }
  const [rows, details] = await Promise.all([
    listAdminProducts({}),
    (await getDb())
      .select({
        id: products.id,
        applications: products.applications,
        warranty: products.warranty,
        specs: products.specs,
      })
      .from(products),
  ]);
  const extra = new Map(details.map((row) => [row.id, row]));
  const csv = toCsv(
    [
      "Name",
      "SKU",
      "Model line",
      "Brand",
      "Category",
      "MRP (₹)",
      "Price (₹)",
      "Price shown",
      "Stock",
      "Warranty",
      "Published",
      "Featured",
      "Applications",
      "Specifications",
      "Website link",
    ],
    rows.map((row) => {
      const more = extra.get(row.id);
      return [
        row.name,
        row.sku,
        row.subtitle,
        row.brandName ?? "",
        row.categoryName ?? "",
        row.mrp ?? "",
        row.price ?? "",
        row.showPrice ? "Yes" : "No",
        stockStatusLabels[row.stockStatus],
        more?.warranty ?? "",
        row.isPublished ? "Yes" : "No",
        row.isFeatured ? "Yes" : "No",
        more?.applications.join("; ") ?? "",
        more?.specs.map((spec) => `${spec.label}: ${spec.value}`).join("; ") ?? "",
        `${siteConfig.url}/products/${row.slug}`,
      ];
    }),
  );
  return csvResponse(datedFileName("ishita-products"), csv);
}
