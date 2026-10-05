import { Download, ExternalLink, IndianRupee, Package, Pencil, Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { adminButton, ButtonLink } from "@/admin/components/ui/button";
import { FilterBar, FilterSelect, param, type SearchParams } from "@/admin/components/ui/listing";
import { Badge, Callout, Card, EmptyState, PageHeader, Table, TD, TH } from "@/admin/components/ui/primitives";
import { ReorderButtons } from "@/admin/components/ui/reorder-buttons";
import { can } from "@/admin/config/permissions";
import { resolveImage } from "@/admin/content/images";
import { stockStatuses, stockStatusLabels, type StockStatus } from "@/admin/content/types";
import { moveProduct, toggleProductFlag } from "@/admin/features/products/actions";
import { BULK_FORM_ID, ProductsBulkBar, ProductsSelectAll } from "@/admin/features/products/bulk-bar";
import { getCatalogOptions, listAdminProducts } from "@/admin/features/products/queries";
import { formatINR, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Products" };

const stockTone: Record<StockStatus, "leaf" | "amber" | "blue" | "red"> = {
  in_stock: "leaf",
  low_stock: "amber",
  on_order: "blue",
  out_of_stock: "red",
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission("products:read");
  const params = await searchParams;
  const filters = {
    q: param(params, "q"),
    brand: param(params, "brand"),
    category: param(params, "category"),
    status: param(params, "status"),
    stock: param(params, "stock"),
  };
  const filtered = Object.values(filters).some(Boolean);
  const [rows, options] = await Promise.all([listAdminProducts(filters), getCatalogOptions()]);
  const canWrite = can(user.role, "products:write");

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything on the website’s products page. Order here is the order visitors see."
        breadcrumbs={[{ label: "Catalogue" }, { label: "Products" }]}
        actions={
          <>
            <a href="/api/admin/export/products" download className={adminButton({ variant: "secondary" })}>
              <Download aria-hidden="true" /> Export CSV
            </a>
            {canWrite ? (
              <>
                <ButtonLink href="/admin/products/prices" variant="secondary">
                  <IndianRupee aria-hidden="true" /> Quick price editor
                </ButtonLink>
                <ButtonLink href="/admin/products/new">
                  <Plus aria-hidden="true" /> Add product
                </ButtonLink>
              </>
            ) : null}
          </>
        }
      />

      {param(params, "deleted") ? (
        <Callout tone="success" className="mb-4">
          Product deleted.
        </Callout>
      ) : null}

      <Card>
        <FilterBar basePath="/admin/products" query={filters.q} placeholder="Search name, model, SKU or spec…">
          <FilterSelect
            name="brand"
            value={filters.brand}
            label="All brands"
            options={[
              ...options.brands.map((b) => ({ value: b.id, label: b.name })),
              { value: "none", label: "No brand" },
            ]}
          />
          <FilterSelect
            name="category"
            value={filters.category}
            label="All categories"
            options={[
              ...options.categories.map((c) => ({ value: c.id, label: c.name })),
              { value: "none", label: "No category" },
            ]}
          />
          <FilterSelect
            name="status"
            value={filters.status}
            label="Any status"
            options={[
              { value: "published", label: "Published" },
              { value: "hidden", label: "Hidden" },
              { value: "featured", label: "Featured" },
              { value: "no-price", label: "No price set" },
            ]}
          />
          <FilterSelect
            name="stock"
            value={filters.stock}
            label="Any stock"
            options={stockStatuses.map((status) => ({ value: status, label: stockStatusLabels[status] }))}
          />
        </FilterBar>

        {canWrite ? <ProductsBulkBar /> : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={filtered ? "No products match these filters" : "No products yet"}
            description={
              filtered
                ? "Try different filters or reset them."
                : "Add your first product — it appears on the website as soon as it’s published."
            }
            action={
              canWrite && !filtered ? (
                <ButtonLink href="/admin/products/new">
                  <Plus aria-hidden="true" /> Add product
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                {canWrite ? (
                  <TH className="w-10">
                    <ProductsSelectAll />
                  </TH>
                ) : null}
                <TH>Product</TH>
                <TH>Brand / category</TH>
                <TH align="right">Price</TH>
                <TH>Stock</TH>
                <TH align="center">Website</TH>
                <TH>Updated</TH>
                <TH align="right">
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const image = resolveImage(row.image, row.name);
                return (
                  <tr key={row.id} className={cn("hover:bg-slate-50/70", !row.isPublished && "bg-slate-50/50")}>
                    {canWrite ? (
                      <TD>
                        <input
                          type="checkbox"
                          name="ids"
                          value={row.id}
                          form={BULK_FORM_ID}
                          aria-label={`Select ${row.name}`}
                          className="size-4 rounded border-slate-300 accent-navy-800"
                        />
                      </TD>
                    ) : null}
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#f3f9ff]">
                          {image ? (
                            <Image src={image.src} alt="" fill sizes="48px" className="object-contain p-1" />
                          ) : (
                            <Package className="size-5 text-slate-300" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${row.id}`}
                            className="block max-w-[340px] truncate font-semibold text-navy-950 hover:text-brand-600 hover:underline"
                          >
                            {row.name}
                          </Link>
                          <p className="max-w-[340px] truncate text-xs text-slate-500">
                            {[row.sku, row.subtitle].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <p className="text-sm text-slate-700">
                        {row.brandName ?? <span className="text-slate-400">No brand</span>}
                      </p>
                      <p className="text-xs text-slate-500">{row.categoryName ?? "—"}</p>
                    </TD>
                    <TD align="right" className="tabular-nums">
                      {row.price !== null ? (
                        <>
                          <p className="font-semibold text-slate-800">{formatINR(row.price)}</p>
                          <p className="text-xs text-slate-500">
                            {row.showPrice ? (
                              row.mrp && row.mrp > row.price ? (
                                <s>{formatINR(row.mrp)}</s>
                              ) : (
                                "Shown"
                              )
                            ) : (
                              "Hidden on site"
                            )}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Enquiry only</span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={stockTone[row.stockStatus]} dot>
                        {stockStatusLabels[row.stockStatus]}
                      </Badge>
                    </TD>
                    <TD align="center">
                      <div className="flex items-center justify-center gap-1">
                        {canWrite ? (
                          <>
                            <form action={toggleProductFlag}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="field" value="isPublished" />
                              <input type="hidden" name="value" value={row.isPublished ? "0" : "1"} />
                              <button
                                type="submit"
                                role="switch"
                                aria-checked={row.isPublished}
                                aria-label={`${row.name}: ${row.isPublished ? "published — click to hide" : "hidden — click to publish"}`}
                                title={row.isPublished ? "Published — click to hide" : "Hidden — click to publish"}
                                className={cn(
                                  "relative h-5 w-9 rounded-full transition-colors",
                                  row.isPublished ? "bg-leaf-600" : "bg-slate-300",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
                                    row.isPublished && "translate-x-4",
                                  )}
                                />
                              </button>
                            </form>
                            <form action={toggleProductFlag}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="field" value="isFeatured" />
                              <input type="hidden" name="value" value={row.isFeatured ? "0" : "1"} />
                              <button
                                type="submit"
                                aria-pressed={row.isFeatured}
                                aria-label={`${row.name}: ${row.isFeatured ? "featured on homepage — click to remove" : "click to feature on homepage"}`}
                                title={row.isFeatured ? "Featured on the homepage" : "Feature on the homepage"}
                                className={cn(
                                  "rounded-md p-1 transition-colors",
                                  row.isFeatured
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-slate-300 hover:bg-slate-100 hover:text-slate-500",
                                )}
                              >
                                <Star className={cn("size-4", row.isFeatured && "fill-current")} />
                              </button>
                            </form>
                          </>
                        ) : (
                          <>
                            {row.isPublished ? <Badge tone="leaf">Published</Badge> : <Badge>Hidden</Badge>}
                            {row.isFeatured ? (
                              <Star className="size-4 fill-amber-400 text-amber-500" aria-label="Featured" />
                            ) : null}
                          </>
                        )}
                      </div>
                    </TD>
                    <TD className="text-xs whitespace-nowrap text-slate-500">{timeAgo(row.updatedAt)}</TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-0.5">
                        {canWrite && !filtered ? (
                          <ReorderButtons
                            action={moveProduct}
                            id={row.id}
                            isFirst={index === 0}
                            isLast={index === rows.length - 1}
                            label={row.name}
                          />
                        ) : null}
                        <a
                          href={`/products/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={adminButton({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`View ${row.name} on the website`}
                          title="View on website"
                        >
                          <ExternalLink />
                        </a>
                        <Link
                          href={`/admin/products/${row.id}`}
                          className={adminButton({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Edit ${row.name}`}
                          title="Edit"
                        >
                          <Pencil />
                        </Link>
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {rows.length ? (
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            {rows.length} product{rows.length === 1 ? "" : "s"}
            {filtered ? " match" : ""} · {rows.filter((row) => row.isPublished).length} published ·{" "}
            {rows.filter((row) => row.isFeatured).length} featured
            {filtered && canWrite ? " · clear the filters to reorder" : ""}
          </p>
        ) : null}
      </Card>
    </>
  );
}
