"use client";

import { ExternalLink, IndianRupee } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Field, FormGrid, FormSection, Input, Select, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { SearchPreview } from "@/admin/components/ui/search-preview";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { TagsInput } from "@/admin/components/ui/tags-input";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { useUnsavedChanges } from "@/admin/components/ui/use-unsaved-changes";
import type { FileRef, ImageRef } from "@/admin/content/images";
import { stockStatuses, stockStatusLabels, type ProductSpec, type StockStatus } from "@/admin/content/types";
import { FileField, GalleryField, ImageField } from "@/admin/features/media/image-field";
import { formatDateTime, formatINR } from "@/admin/lib/format";
import { slugify } from "@/admin/lib/slug";

import { saveProduct } from "./actions";
import { SpecsEditor } from "./specs-editor";

export interface ProductFormValues {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brandId: string | null;
  categoryId: string | null;
  typeLabel: string;
  subtitle: string;
  badge: string;
  summary: string;
  description: string;
  image: ImageRef | null;
  gallery: ImageRef[];
  specs: ProductSpec[];
  applications: string[];
  mrp: number | null;
  price: number | null;
  priceNote: string;
  showPrice: boolean;
  stockStatus: StockStatus;
  warranty: string;
  datasheet: FileRef | null;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
}

interface ProductFormProps {
  product: ProductFormValues | null;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  applications: string[];
  siteUrl: string;
  siteName: string;
}

const counter = (value: string, max: number) => (
  <span className={value.length > max ? "font-semibold text-red-600" : undefined}>
    {value.length}/{max}
  </span>
);

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-card">
      <h2 className="border-b border-slate-100 px-5 py-3.5 font-display text-sm font-bold text-navy-950">{title}</h2>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

/** Create / edit a product. Everything here is what the website's product cards and details show. */
export function ProductForm({ product, brands, categories, applications, siteUrl, siteName }: ProductFormProps) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const { pending, onSubmit, errors } = useFormAction(saveProduct, {
    onSuccess: (result) => {
      setDirty(false);
      const id = result.data?.id;
      if (!product && typeof id === "string") router.push(`/admin/products/${id}`);
    },
  });
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "");
  const [mrp, setMrp] = useState(product?.mrp?.toString() ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const markDirty = () => setDirty(true);

  useUnsavedChanges(dirty);

  const specsError = errors.specs ?? Object.entries(errors).find(([key]) => key.startsWith("specs."))?.[1];
  const numericMrp = Number(mrp.replace(/[,\s]/g, ""));
  const numericPrice = Number(price.replace(/[,\s]/g, ""));
  const discount =
    mrp && price && numericMrp > 0 && numericPrice < numericMrp ? Math.round((1 - numericPrice / numericMrp) * 100) : 0;
  const productUrl = `${siteUrl}/products/${slug || "your-product"}`;

  return (
    <form
      onSubmit={onSubmit}
      onChange={markDirty}
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      noValidate
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="flex min-w-0 flex-col gap-6">
        <FormSection title="Basics" description="Name, brand and the lines shown on the product card.">
          <Field label="Product name" htmlFor="p-name" error={errors.name} required aside={counter(name, 140)}>
            <Input
              id="p-name"
              name="name"
              value={name}
              maxLength={140}
              required
              aria-invalid={!!errors.name || undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              placeholder="e.g. Exide InvaMaster Tall Tubular (200Ah)"
            />
          </Field>
          <Field
            label="Web address"
            htmlFor="p-slug"
            error={errors.slug}
            required
            hint={
              <>
                The product opens at <span className="font-mono text-slate-700">/products/{slug || "…"}</span>. Changing
                it later is safe: the old address redirects here automatically.
              </>
            }
          >
            <Input
              id="p-slug"
              name="slug"
              value={slug}
              maxLength={80}
              required
              aria-invalid={!!errors.slug || undefined}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              className="font-mono"
            />
          </Field>
          <FormGrid>
            <Field label="Brand" htmlFor="p-brand" error={errors.brandId}>
              <Select id="p-brand" name="brandId" defaultValue={product?.brandId ?? ""}>
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="p-category" error={errors.categoryId}>
              <Select id="p-category" name="categoryId" defaultValue={product?.categoryId ?? ""}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Type label"
              htmlFor="p-type"
              error={errors.typeLabel}
              hint="Small green line above the name, e.g. “HEAVY COMMERCIAL TUBULAR”."
            >
              <Input id="p-type" name="typeLabel" defaultValue={product?.typeLabel} maxLength={60} />
            </Field>
            <Field
              label="Model line"
              htmlFor="p-subtitle"
              error={errors.subtitle}
              hint="e.g. “Model: IMTT2000 | Heavy Duty Spine”."
            >
              <Input id="p-subtitle" name="subtitle" defaultValue={product?.subtitle} maxLength={160} />
            </Field>
            <Field
              label="SKU / model code"
              htmlFor="p-sku"
              error={errors.sku}
              hint="Shown in the details window and on enquiries."
            >
              <Input id="p-sku" name="sku" defaultValue={product?.sku} maxLength={60} className="font-mono" />
            </Field>
            <Field
              label="Card badge"
              htmlFor="p-badge"
              error={errors.badge}
              hint="Top-right chip, e.g. “60 Months Warranty”. Leave empty for none."
            >
              <Input id="p-badge" name="badge" defaultValue={product?.badge} maxLength={40} />
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Description">
          <Field
            label="Short summary"
            htmlFor="p-summary"
            error={errors.summary}
            hint="One line for compact cards (homepage featured products)."
            aside={counter(summary, 240)}
          >
            <Input
              id="p-summary"
              name="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={240}
            />
          </Field>
          <Field
            label="Full description"
            htmlFor="p-description"
            error={errors.description}
            hint="Shown in the product details window."
          >
            <Textarea
              id="p-description"
              name="description"
              rows={5}
              defaultValue={product?.description}
              maxLength={4000}
            />
          </Field>
        </FormSection>

        <FormSection title="Images & datasheet">
          <ImageField
            name="image"
            label="Main image"
            defaultValue={product?.image ?? null}
            error={errors.image}
            hint="Transparent PNG or a photo on white works best."
            onChange={markDirty}
          />
          <GalleryField
            name="gallery"
            label="Gallery"
            defaultValue={product?.gallery ?? []}
            error={errors.gallery}
            hint="Extra angles shown in the details window."
            onChange={markDirty}
          />
          <FileField
            name="datasheet"
            label="Datasheet (PDF)"
            defaultValue={product?.datasheet ?? null}
            error={errors.datasheet}
            hint="Adds the “Download OEM Datasheet” button."
            onChange={markDirty}
          />
        </FormSection>

        <FormSection title="Technical specifications">
          <SpecsEditor name="specs" defaultValue={product?.specs ?? []} error={specsError} onChange={markDirty} />
        </FormSection>

        <FormSection
          title="Applications"
          description="Where the product fits — powers the “All Applications” filter on the products page."
        >
          <Field
            label="Applications"
            htmlFor="p-applications"
            error={errors.applications}
            hint="Press Enter or comma after each, e.g. Homes, Clinics, Petrol pumps."
          >
            <TagsInput
              id="p-applications"
              name="applications"
              defaultValue={product?.applications ?? []}
              suggestions={applications}
              invalid={!!errors.applications}
              onChange={markDirty}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Search engines (SEO)"
          description="Optional. Leave empty to use the product name and summary."
        >
          <Field label="SEO title" htmlFor="p-seo-title" error={errors.seoTitle} aside={counter(seoTitle, 70)}>
            <Input
              id="p-seo-title"
              name="seoTitle"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              maxLength={70}
              placeholder={name ? `${name} | ${siteName}` : undefined}
            />
          </Field>
          <Field
            label="SEO description"
            htmlFor="p-seo-description"
            error={errors.seoDescription}
            aside={counter(seoDescription, 170)}
          >
            <Textarea
              id="p-seo-description"
              name="seoDescription"
              rows={3}
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              maxLength={170}
              placeholder={summary || undefined}
            />
          </Field>
          <SearchPreview
            title={seoTitle || (name ? `${name} | ${siteName}` : "")}
            description={seoDescription || summary}
            url={productUrl}
          />
        </FormSection>
      </div>

      <aside className="flex flex-col gap-6 xl:sticky xl:top-24">
        <SideCard title="Publishing">
          <Toggle
            id="p-published"
            name="isPublished"
            defaultChecked={product?.isPublished ?? true}
            label="Published"
            description="Visible on the website’s products page."
          />
          <Toggle
            id="p-featured"
            name="isFeatured"
            defaultChecked={product?.isFeatured ?? false}
            label="Featured"
            description="Also shown in the homepage’s featured products."
          />
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <SubmitButton pending={pending} pendingLabel="Saving…" size="lg" className="w-full">
              {product ? "Save changes" : "Create product"}
            </SubmitButton>
            {dirty ? <p className="text-center text-xs font-medium text-amber-700">You have unsaved changes.</p> : null}
            {product ? (
              <>
                <a
                  href={`/products/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                >
                  View on website <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
                <p className="text-center text-xs text-slate-500">Last saved {formatDateTime(product.updatedAt)}</p>
              </>
            ) : null}
          </div>
        </SideCard>

        <SideCard title="Pricing">
          <FormGrid className="sm:grid-cols-2 xl:grid-cols-2">
            <Field label="MRP (₹)" htmlFor="p-mrp" error={errors.mrp}>
              <PriceInput id="p-mrp" name="mrp" value={mrp} onChange={setMrp} invalid={!!errors.mrp} />
            </Field>
            <Field label="Price (₹)" htmlFor="p-price" error={errors.price}>
              <PriceInput id="p-price" name="price" value={price} onChange={setPrice} invalid={!!errors.price} />
            </Field>
          </FormGrid>
          {discount > 0 && Number.isFinite(numericPrice) ? (
            <p className="-mt-1 text-xs font-semibold text-leaf-700">
              {discount}% below MRP · saves {formatINR(numericMrp - numericPrice)}
            </p>
          ) : null}
          <Field
            label="Price note"
            htmlFor="p-price-note"
            error={errors.priceNote}
            hint="e.g. “incl. GST, installation extra”."
          >
            <Input id="p-price-note" name="priceNote" defaultValue={product?.priceNote} maxLength={120} />
          </Field>
          <Toggle
            id="p-show-price"
            name="showPrice"
            defaultChecked={product?.showPrice ?? false}
            label="Show price on website"
            description="Off: visitors see “Get Dealer Price” and enquire."
          />
        </SideCard>

        <SideCard title="Stock & warranty">
          <Field label="Availability" htmlFor="p-stock" error={errors.stockStatus}>
            <Select id="p-stock" name="stockStatus" defaultValue={product?.stockStatus ?? "in_stock"}>
              {stockStatuses.map((status) => (
                <option key={status} value={status}>
                  {stockStatusLabels[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Warranty"
            htmlFor="p-warranty"
            error={errors.warranty}
            hint="e.g. “66 Months (36 Free + 30 Pro-Rata)”."
          >
            <Input id="p-warranty" name="warranty" defaultValue={product?.warranty} maxLength={80} />
          </Field>
        </SideCard>
      </aside>
    </form>
  );
}

function PriceInput({
  id,
  name,
  value,
  onChange,
  invalid,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="relative">
      <IndianRupee
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d,]/g, ""))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="—"
        aria-invalid={invalid || undefined}
        className="pl-8 tabular-nums"
      />
    </div>
  );
}
