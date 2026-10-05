import Image from "next/image";
import type { MouseEvent } from "react";

import { stockStatusLabels, type StockStatus } from "@/admin/content/types";
import { BoltIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { ChatIcon } from "./icons";
import type { CatalogueProduct } from "./types";

export type OpenIntent = "details" | "rfq";

/** Shareable address of a product's details popup. */
/** The product's own page; on the catalogue a plain click opens the popup instead. */
export const productHref = (slug: string) => `/products/${encodeURIComponent(slug)}`;

/** Brand chip colours from the Figma grid (224:7330); other brands fall back to navy. */
const brandChipTones: Record<string, string> = {
  exide: "bg-navy-900",
  utl: "bg-[#904d00]",
  microtek: "bg-navy-800",
};

/** Warranty claims get the green chip, every other highlight the soft amber one (both from the design). */
export const badgeTone = (badge: string) =>
  /warrant|guarantee/i.test(badge) ? "bg-leaf-600 text-white" : "bg-[#ffdcc3] text-[#2f1500]";

const stockTones: Record<Exclude<StockStatus, "in_stock">, string> = {
  low_stock: "text-amber-700 before:bg-amber-500",
  on_order: "text-brand-700 before:bg-brand-500",
  out_of_stock: "text-red-700 before:bg-red-500",
};

export function StockNote({ status, className }: { status: StockStatus; className?: string }) {
  if (status === "in_stock") return null;
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-[12.5px] leading-4 font-semibold before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
        stockTones[status],
        className,
      )}
    >
      {stockStatusLabels[status]}
    </p>
  );
}

export function PriceLine({ price, className }: { price: NonNullable<CatalogueProduct["price"]>; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className="font-display text-[19px] leading-6 font-extrabold text-navy-900">
        <span className="sr-only">Price: </span>
        {price.amount}
      </span>
      {price.mrp ? (
        <s className="text-[13px] leading-5 text-slate-400">
          <span className="sr-only">MRP </span>
          {price.mrp}
        </s>
      ) : null}
      {price.note ? <span className="text-[12px] leading-5 text-slate-500">{price.note}</span> : null}
    </p>
  );
}

/** Pale well shown when a product has no photo yet. */
export function ImagePlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2", className)}
    >
      <BoltIcon className="size-12 text-navy-800/20" />
      <span className="text-[11px] font-bold tracking-[0.14em] text-navy-800/35 uppercase">{label}</span>
    </div>
  );
}

interface ProductCardProps {
  product: CatalogueProduct;
  ctaLabel: string;
  enquiryHref: string;
  onOpen: (slug: string, intent: OpenIntent, trigger: HTMLElement) => void;
}

/** Catalogue card (Figma 224:7368): image well, chips, specs, dealer-price and WhatsApp actions. */
export function ProductCard({ product, ctaLabel, enquiryHref, onOpen }: ProductCardProps) {
  const { image, brand } = product;
  const titleId = `product-${product.slug}-title`;

  const openDetails = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks open the shareable URL in a new tab/window as usual.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(product.slug, "details", event.currentTarget);
  };

  return (
    <article
      aria-labelledby={titleId}
      data-product-slug={product.slug}
      data-track-context="product-card"
      className="group/card @container relative flex w-full flex-col overflow-hidden rounded-[9.5px] bg-white shadow-[0_1.2px_2.4px_rgb(0_0_0/0.05),0_0_0_1px_rgb(15_23_42/0.045)] transition-[translate,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_22px_40px_-26px_rgb(0_35_111/0.35),0_0_0_1px_rgb(15_23_42/0.06)]"
    >
      <div className="relative h-[229px] shrink-0 overflow-hidden bg-surface">
        {image ? (
          <div className="absolute inset-x-[19px] inset-y-[28.5px]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 640px) 400px, 300px"
              placeholder={image.placeholder}
              blurDataURL={image.blurDataURL}
              style={{ objectFit: "contain" }}
              // Multiply lets white studio backgrounds melt into the pale-blue well.
              className="mix-blend-multiply transition-transform duration-700 ease-out-expo group-hover/card:scale-[1.04]"
            />
          </div>
        ) : (
          <ImagePlaceholder label={brand?.short ?? "Ishita Traders"} />
        )}
        <div className="pointer-events-none absolute inset-x-[14.3px] top-[14.3px] flex items-start justify-between gap-2">
          {brand ? (
            <span
              className={cn(
                "rounded-[4.8px] px-[9.5px] py-[2.4px] text-[13.1px] leading-[16.7px] font-semibold tracking-[0.04em] text-white uppercase",
                brandChipTones[brand.slug] ?? "bg-navy-900",
              )}
            >
              {brand.short}
            </span>
          ) : (
            <span />
          )}
          {product.badge ? (
            <span
              className={cn(
                "rounded-[4.8px] px-[9.5px] py-[2.4px] text-right text-[13.1px] leading-[16.7px] font-bold tracking-[0.04em]",
                badgeTone(product.badge),
              )}
            >
              {product.badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[9.5px] p-[19px]">
        <div className="flex flex-col">
          {product.typeLabel ? (
            <p className="text-[13.1px] leading-[16.7px] font-bold tracking-[0.04em] text-leaf-600 uppercase">
              {product.typeLabel}
            </p>
          ) : null}
          <h3
            id={titleId}
            className="font-display text-[19px] leading-[26px] font-bold text-balance-safe text-ink @[340px]:text-[21.5px] @[340px]:leading-[28.6px]"
          >
            <a
              href={productHref(product.slug)}
              onClick={openDetails}
              className="transition-colors outline-none group-hover/card:text-navy-800 after:absolute after:inset-0 after:rounded-[9.5px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-500"
            >
              {product.name}
            </a>
          </h3>
          {product.subtitle ? (
            <p className="text-[14.3px] leading-[21.5px] break-words text-body">{product.subtitle}</p>
          ) : null}
          <StockNote status={product.stockStatus} className="mt-1.5" />
        </div>

        {product.price ? <PriceLine price={product.price} /> : null}

        {product.cardSpecs.length > 0 ? (
          <dl className="grid grid-cols-1 gap-[9.5px] rounded-[4.8px] bg-surface p-[4.8px] @[300px]:grid-cols-2">
            {product.cardSpecs.map((spec, index) => (
              <div key={`${spec.label}-${index}`} className="min-w-0">
                <dt className="text-[13.1px] leading-[16.7px] font-bold tracking-[0.04em] text-body">
                  {spec.label.replace(/:\s*$/, "")}
                  <span aria-hidden="true">:</span>
                </dt>
                <dd
                  className={cn(
                    "text-[14.3px] leading-[21.5px] font-semibold break-words text-ink",
                    index === 3 && "text-[#003122]",
                  )}
                >
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="relative z-10 mt-auto flex items-center gap-[4.8px] pt-[9.5px]">
          <button
            type="button"
            onClick={(event) => onOpen(product.slug, "rfq", event.currentTarget)}
            aria-label={`${ctaLabel} — ${product.name}`}
            className={buttonStyles({
              className:
                "h-[43px] min-w-0 flex-1 rounded-[4.8px] bg-navy-900 px-[14.3px] text-[14.3px] leading-[19.1px] font-semibold tracking-[0.02em] hover:bg-brand-600",
            })}
          >
            {ctaLabel}
          </button>
          <a
            href={enquiryHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask for the price of ${product.name} on WhatsApp (opens in a new tab)`}
            className="flex size-[43px] shrink-0 items-center justify-center rounded-[4.8px] bg-leaf-deep text-white shadow-card transition-[background-color,transform] duration-300 ease-out-expo hover:bg-[#00382a] active:scale-[0.96]"
          >
            <ChatIcon className="size-[15px]" />
          </a>
        </div>
      </div>
    </article>
  );
}
