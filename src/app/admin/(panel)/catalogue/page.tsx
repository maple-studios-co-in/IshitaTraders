import { Pencil, Tags, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/admin/components/ui/primitives";
import { ReorderButtons } from "@/admin/components/ui/reorder-buttons";
import { can } from "@/admin/config/permissions";
import { resolveImage } from "@/admin/content/images";
import { deleteBrand, deleteCategory, moveBrand, moveCategory } from "@/admin/features/catalogue/actions";
import { getCatalogueTaxonomy } from "@/admin/features/catalogue/queries";
import { BrandForm, CategoryForm } from "@/admin/features/catalogue/taxonomy-forms";
import { pluralize } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "Brands & categories" };

export default async function CataloguePage() {
  const user = await requirePermission("products:read");
  const { brands, categories } = await getCatalogueTaxonomy();
  const canWrite = can(user.role, "products:write");
  const canDelete = can(user.role, "products:delete");

  return (
    <>
      <PageHeader
        title="Brands & categories"
        description="Brands become the catalogue tabs on the products page; categories are the “What We Provide” cards on the homepage."
        breadcrumbs={[{ label: "Catalogue" }, { label: "Brands & categories" }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Brands" description={`${brands.length} total · order = tab order`} />
          {brands.length === 0 ? (
            <EmptyState icon={<Tags />} title="No brands yet" />
          ) : (
            <ol className="divide-y divide-slate-100">
              {brands.map((brand, index) => {
                const logo = resolveImage(brand.logo, brand.name);
                return (
                  <li key={brand.id} id={`brand-${brand.id}`} className="scroll-mt-24">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                        <span className="relative flex h-9 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                          {logo ? (
                            <Image src={logo.src} alt="" fill sizes="80px" className="object-contain p-1" />
                          ) : (
                            <span className="text-xs text-slate-400">No logo</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-800">{brand.name}</span>
                          <span className="block text-xs text-slate-500">
                            <Link href={`/admin/products?brand=${brand.id}`} className="hover:underline">
                              {pluralize(brand.productCount, "product")}
                            </Link>{" "}
                            · /products?brand={brand.slug}
                          </span>
                        </span>
                        {brand.isActive ? <Badge tone="leaf">Active</Badge> : <Badge>Inactive</Badge>}
                        {canWrite ? (
                          <Pencil className="size-4 text-slate-400 group-open:text-navy-800" aria-hidden="true" />
                        ) : null}
                      </summary>
                      {canWrite ? (
                        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                          <BrandForm brand={brand} />
                          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                            <ReorderButtons
                              action={moveBrand}
                              id={brand.id}
                              isFirst={index === 0}
                              isLast={index === brands.length - 1}
                              label={brand.name}
                            />
                            {canDelete ? (
                              <ConfirmAction
                                action={deleteBrand}
                                fields={{ id: brand.id }}
                                title={`Delete ${brand.name}?`}
                                description={
                                  brand.productCount ? (
                                    <>
                                      Its {pluralize(brand.productCount, "product")} stay on the website without a brand
                                      (and disappear from the brand tab). Consider making the brand inactive instead.
                                    </>
                                  ) : (
                                    "The brand will be removed. This can’t be undone."
                                  )
                                }
                                confirmLabel="Delete brand"
                              >
                                <Trash2 /> Delete
                              </ConfirmAction>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
          {canWrite ? (
            <details className="border-t border-slate-100">
              <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-brand-600 hover:bg-slate-50">
                + Add a brand
              </summary>
              <div className="border-t border-slate-100 px-5 py-4">
                <BrandForm />
              </div>
            </details>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Categories"
            description={`${categories.length} total · ${categories.filter((c) => c.showOnHomepage).length} on the homepage`}
          />
          {categories.length === 0 ? (
            <EmptyState icon={<Tags />} title="No categories yet" />
          ) : (
            <ol className="divide-y divide-slate-100">
              {categories.map((category, index) => {
                const image = resolveImage(category.image, category.name);
                return (
                  <li key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          {image ? <Image src={image.src} alt="" fill sizes="44px" className="object-cover" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-800">{category.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            <Link href={`/admin/products?category=${category.id}`} className="hover:underline">
                              {pluralize(category.productCount, "product")}
                            </Link>
                            {category.label ? ` · ${category.label}` : ""}
                          </span>
                        </span>
                        {category.showOnHomepage ? <Badge tone="blue">Homepage</Badge> : <Badge>Hidden</Badge>}
                        {canWrite ? (
                          <Pencil className="size-4 text-slate-400 group-open:text-navy-800" aria-hidden="true" />
                        ) : null}
                      </summary>
                      {canWrite ? (
                        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                          <CategoryForm category={category} />
                          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                            <ReorderButtons
                              action={moveCategory}
                              id={category.id}
                              isFirst={index === 0}
                              isLast={index === categories.length - 1}
                              label={category.name}
                            />
                            {canDelete ? (
                              <ConfirmAction
                                action={deleteCategory}
                                fields={{ id: category.id }}
                                title={`Delete ${category.name}?`}
                                description={
                                  category.productCount
                                    ? `Its ${pluralize(category.productCount, "product")} are kept, without a category. To only hide the homepage card, switch off “Show on homepage”.`
                                    : "The category will be removed. This can’t be undone."
                                }
                                confirmLabel="Delete category"
                              >
                                <Trash2 /> Delete
                              </ConfirmAction>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
          {canWrite ? (
            <details className="border-t border-slate-100">
              <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-brand-600 hover:bg-slate-50">
                + Add a category
              </summary>
              <div className="border-t border-slate-100 px-5 py-4">
                <CategoryForm />
              </div>
            </details>
          ) : null}
        </Card>
      </div>
    </>
  );
}
