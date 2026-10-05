import type { Metadata } from "next";

import { PageHeader } from "@/admin/components/ui/primitives";
import { getSiteSettings } from "@/admin/content/settings";
import { ProductForm } from "@/admin/features/products/product-form";
import { getCatalogOptions } from "@/admin/features/products/queries";
import { requirePermission } from "@/admin/server/auth/guard";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requirePermission("products:write");
  const [options, settings] = await Promise.all([getCatalogOptions(), getSiteSettings()]);
  return (
    <>
      <PageHeader
        title="Add product"
        description="Fill in what the product card and details window should show. You can save it hidden and publish later."
        breadcrumbs={[{ label: "Catalogue" }, { label: "Products", href: "/admin/products" }, { label: "Add product" }]}
      />
      <ProductForm
        product={null}
        brands={options.brands}
        categories={options.categories}
        applications={options.applications}
        siteUrl={siteConfig.url}
        siteName={settings.business.name}
      />
    </>
  );
}
