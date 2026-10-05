import { and, desc, eq } from "drizzle-orm";
import { Copy, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/admin/components/ui/action-button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Callout, Card, CardHeader, PageHeader } from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { getSiteSettings } from "@/admin/content/settings";
import { deleteProduct, duplicateProduct } from "@/admin/features/products/actions";
import { ProductForm } from "@/admin/features/products/product-form";
import { getAdminProduct, getCatalogOptions } from "@/admin/features/products/queries";
import { toFormValues } from "@/admin/features/products/to-form-values";
import { timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { activityLog, enquiries } from "@/admin/server/db/schema";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await getAdminProduct((await params).id);
  return { title: product ? `Edit · ${product.name}` : "Product not found" };
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission("products:read");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const product = await getAdminProduct(id);
  if (!product) notFound();

  const db = await getDb();
  const [options, settings, history, leads] = await Promise.all([
    getCatalogOptions(),
    getSiteSettings(),
    db
      .select({
        id: activityLog.id,
        summary: activityLog.summary,
        actorName: activityLog.actorName,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .where(and(eq(activityLog.entityType, "product"), eq(activityLog.entityId, product.id)))
      .orderBy(desc(activityLog.createdAt))
      .limit(6),
    db
      .select({
        id: enquiries.id,
        name: enquiries.name,
        company: enquiries.company,
        status: enquiries.status,
        createdAt: enquiries.createdAt,
      })
      .from(enquiries)
      .where(eq(enquiries.productId, product.id))
      .orderBy(desc(enquiries.createdAt))
      .limit(5),
  ]);
  const canWrite = can(user.role, "products:write");

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.isPublished ? "Published on the website." : "Hidden — not visible on the website."}
        breadcrumbs={[{ label: "Catalogue" }, { label: "Products", href: "/admin/products" }, { label: product.name }]}
        actions={
          canWrite ? (
            <>
              <ActionButton action={duplicateProduct} fields={{ id: product.id }} pendingLabel="Copying…">
                <Copy aria-hidden="true" /> Duplicate
              </ActionButton>
              {can(user.role, "products:delete") ? (
                <ConfirmAction
                  action={deleteProduct}
                  fields={{ id: product.id, redirectTo: "list" }}
                  title="Delete this product?"
                  description={
                    <>
                      “{product.name}” will be removed from the website immediately. Enquiries about it are kept. This
                      can’t be undone — hide it instead if you might sell it again.
                    </>
                  }
                  confirmLabel="Delete product"
                  variant="danger-ghost"
                  size="md"
                >
                  <Trash2 aria-hidden="true" /> Delete
                </ConfirmAction>
              ) : null}
            </>
          ) : null
        }
      />

      {query.copied ? (
        <Callout tone="success" className="mb-4" title="This is a copy">
          It’s hidden until you publish it. Change the name and web address, then save.
        </Callout>
      ) : null}

      {canWrite ? (
        <ProductForm
          product={toFormValues(product)}
          brands={options.brands}
          categories={options.categories}
          applications={options.applications}
          siteUrl={siteConfig.url}
          siteName={settings.business.name}
        />
      ) : (
        <Callout tone="info">You have read-only access. Ask an admin for editor access to change products.</Callout>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Enquiries for this product" description="RFQs submitted from its details window." />
          {leads.length ? (
            <ul className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/enquiries/${lead.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {[lead.name, lead.company].filter(Boolean).join(" · ") || "Unnamed"}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(lead.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">No enquiries yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Change history" description="Who changed what, most recent first." />
          {history.length ? (
            <ul className="divide-y divide-slate-100">
              {history.map((entry) => (
                <li key={entry.id} className="px-5 py-3 text-sm">
                  <p className="text-slate-800">{entry.summary}</p>
                  <p className="text-xs text-slate-500">
                    {entry.actorName.replace(/\s*<.*>$/, "")} · {timeAgo(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-slate-500">No changes recorded yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
