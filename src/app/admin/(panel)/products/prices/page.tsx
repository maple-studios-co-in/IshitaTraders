import type { Metadata } from "next";

import { Card, PageHeader } from "@/admin/components/ui/primitives";
import { PriceEditor } from "@/admin/features/products/price-editor";
import { listAdminProducts } from "@/admin/features/products/queries";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Quick price editor" };

export default async function QuickPricesPage() {
  await requirePermission("products:write");
  const rows = await listAdminProducts({});
  return (
    <>
      <PageHeader
        title="Quick price editor"
        description="Update dealer prices, MRPs and stock for every product on one screen. Only changed rows are saved, and each change is recorded in the activity log."
        breadcrumbs={[
          { label: "Catalogue" },
          { label: "Products", href: "/admin/products" },
          { label: "Quick price editor" },
        ]}
      />
      <Card className="overflow-visible">
        <PriceEditor
          rows={rows.map((row) => ({
            id: row.id,
            name: row.name,
            brand: row.brandName ?? "",
            mrp: row.mrp,
            price: row.price,
            showPrice: row.showPrice,
            stockStatus: row.stockStatus,
          }))}
        />
      </Card>
    </>
  );
}
