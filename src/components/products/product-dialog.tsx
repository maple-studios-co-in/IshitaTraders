"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from "react";

import type { ContactLinks } from "@/admin/content/links";
import type { ProductSpec } from "@/admin/content/types";
import { cn } from "@/lib/cn";
import { lockScroll } from "@/lib/smooth-scroll";

import { DatasheetIcon, DialogCloseIcon } from "./icons";
import { ImagePlaceholder, PriceLine, productHref, StockNote, type OpenIntent } from "./product-card";
import { RfqSection } from "./rfq-form";
import type { CatalogueContact, CatalogueCopy, CatalogueProduct } from "./types";

const TITLE_ID = "product-dialog-title";

interface ProductDialogProps {
  product: CatalogueProduct | null;
  intent: OpenIntent;
  copy: Omit<CatalogueCopy, "bannerImage">;
  contact: CatalogueContact;
  links: ContactLinks;
  /** Called after the dialog has closed (Esc, backdrop, close button). */
  onClose: () => void;
}

/**
 * Product details popup (Figma 219:2312) on a native modal <dialog>: the browser traps focus,
 * closes on Esc and makes the page inert; we lock the page scroll (Lenis) while it is open.
 */
export function ProductDialog({ product, intent, copy, contact, links, onClose }: ProductDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const isOpen = product !== null;
  const slug = product?.slug ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }
    // Focuses the first focusable control (the close button).
    if (!dialog.open) dialog.showModal();
    // Keep the page's scrollbar gutter while its overflow is hidden, so nothing shifts behind the backdrop.
    const root = document.documentElement;
    const gutter = root.style.scrollbarGutter;
    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = "stable";
    lockScroll(true);
    return () => {
      lockScroll(false);
      root.style.scrollbarGutter = gutter;
    };
  }, [isOpen]);

  // "Get Dealer Price" opens the popup at the RFQ form.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !slug || intent !== "rfq") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dialog
      .querySelector("#product-rfq")
      ?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    dialog.querySelector<HTMLElement>("#product-rfq-title")?.focus({ preventScroll: true });
  }, [slug, intent]);

  // Close on a click that starts and ends on the backdrop (not on a text selection dragged outside).
  const onPointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  };
  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (pressedBackdrop.current && event.target === event.currentTarget) event.currentTarget.close();
    pressedBackdrop.current = false;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        "m-auto hidden max-h-[min(1019px,calc(100dvh-2rem))] w-[min(896px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-body shadow-[0_40px_90px_-30px_rgb(15_23_42/0.55)] open:flex",
        "transition-[opacity,translate] duration-300 ease-out-expo starting:open:translate-y-4 starting:open:opacity-0",
        "backdrop:bg-navy-800/60 backdrop:transition-opacity backdrop:duration-300 starting:open:backdrop:opacity-0",
        // Phones: a full-height sheet.
        "max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none max-sm:border-0",
      )}
    >
      {product ? (
        <ProductDetails
          key={product.slug}
          product={product}
          copy={copy}
          contact={contact}
          links={links}
          onRequestClose={() => dialogRef.current?.close()}
        />
      ) : null}
    </dialog>
  );
}

interface ProductDetailsProps extends Pick<ProductDialogProps, "copy" | "contact" | "links"> {
  product: CatalogueProduct;
  /** In the popup: closes it. Omitted on the product's own page (no close button, page scroll, h1 title). */
  onRequestClose?: () => void;
}

export function ProductDetails({ product, copy, contact, links, onRequestClose }: ProductDetailsProps) {
  const inDialog = Boolean(onRequestClose);
  const TitleTag = inDialog ? "h2" : "h1";
  const chip = [product.brand?.short, product.category].filter(Boolean).join(" ");
  const specs: ProductSpec[] =
    product.warranty && !product.specs.some((spec) => /warrant/i.test(spec.label))
      ? [...product.specs, { label: "Warranty", value: product.warranty, highlight: false }]
      : product.specs;
  const enquirySubject = product.sku ? `${product.name} (SKU ${product.sku})` : product.name;

  return (
    <div
      data-track-context={inDialog ? "product-details" : "product-page"}
      data-product-slug={product.slug}
      className={cn("flex flex-col", inDialog && "min-h-0 flex-1")}
    >
      {/* Figma 224:6944 */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#0a162f] bg-navy-700 px-4 pt-[14px] pb-[15px] shadow-[inset_0_2px_4px_rgb(0_0_0/0.05)] sm:px-5">
        <div className="flex min-w-0 items-center">
          {chip ? (
            <span className="shrink-0 rounded-[4px] bg-leaf-600 px-2 py-0.5 font-display text-[10px] leading-[15px] font-extrabold tracking-[0.05em] text-white uppercase shadow-[0_1px_1px_rgb(0_0_0/0.05)]">
              {chip}
            </span>
          ) : null}
          {product.sku ? (
            <p
              className={cn(
                "min-w-0 truncate font-display text-[12px] leading-4 font-semibold tracking-[0.025em] text-slate-200",
                chip && "pl-3",
              )}
            >
              SKU: <span className="font-mono font-normal tracking-normal text-white">{product.sku}</span>
            </p>
          ) : null}
        </div>
        {inDialog ? (
          <span className="flex shrink-0 items-center gap-1">
            <a
              href={productHref(product.slug)}
              className="hidden rounded-full px-2.5 py-1 font-display text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:inline"
            >
              Full page ↗
            </a>
            <button
              type="button"
              onClick={onRequestClose}
              aria-label="Close product details"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-white sm:size-7"
            >
              <DialogCloseIcon className="size-5" />
            </button>
          </span>
        ) : null}
      </div>

      {/* Figma 224:6955 — the only scrolling area; Lenis leaves wheel/touch here to the browser. */}
      <div
        data-lenis-prevent={inDialog || undefined}
        className={cn("p-4 sm:p-6", inDialog && "min-h-0 flex-1 overflow-y-auto overscroll-contain")}
      >
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <ProductGallery product={product} />
            {copy.trustBadges.length > 0 ? (
              <ul aria-label="Why buy from us" className="mt-4 flex gap-2">
                {copy.trustBadges.map((badge, index) => (
                  <li
                    key={index}
                    className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-[6px] border border-blue-100 bg-blue-50/60 px-[7px] py-[9px] text-center"
                  >
                    <span className="font-display text-[10px] leading-[15px] font-bold tracking-[-0.025em] text-slate-900 uppercase">
                      {badge.title}
                    </span>
                    {badge.subtitle ? (
                      <span className="mt-0.5 font-display text-[9px] leading-[11.25px] font-medium text-slate-500">
                        {badge.subtitle}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="min-w-0 md:col-span-7">
            {product.typeLabel ? (
              <p className="font-display text-[11px] leading-[16.5px] font-extrabold tracking-[0.05em] text-leaf-600 uppercase">
                {product.typeLabel}
              </p>
            ) : null}
            <TitleTag
              id={inDialog ? TITLE_ID : "product-title"}
              className={cn(
                "mt-3.5 font-display font-extrabold tracking-[-0.025em] text-balance-safe text-[#0f2042]",
                inDialog
                  ? "text-[22px] leading-[30.25px]"
                  : "text-[26px] leading-[34px] sm:text-[30px] sm:leading-[38px]",
              )}
            >
              {product.name}
            </TitleTag>
            {product.subtitle ? (
              <p className="mt-1 font-display text-[12.5px] leading-[18px] font-medium text-slate-500">
                {product.subtitle}
              </p>
            ) : null}
            {product.description || product.summary ? (
              <p className="mt-3.5 font-display text-[12px] leading-[19.5px] text-slate-600">
                {product.description || product.summary}
              </p>
            ) : null}
            {product.price || product.stockStatus !== "in_stock" ? (
              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {product.price ? <PriceLine price={product.price} /> : null}
                <StockNote status={product.stockStatus} />
              </div>
            ) : null}

            {specs.length > 0 ? (
              <section aria-labelledby="product-specs-title" className="mt-[17px]">
                <h3
                  id="product-specs-title"
                  className="font-display text-[11px] leading-[16.5px] font-bold tracking-[0.05em] text-slate-900 uppercase"
                >
                  Technical specification breakdown
                </h3>
                <dl className="mt-2 overflow-hidden rounded-[6px] border border-slate-200/90">
                  {specs.map((spec, index) => (
                    <div
                      key={`${spec.label}-${index}`}
                      className="grid grid-cols-12 gap-x-3 border-t border-slate-100 px-3 py-1.5 first:border-t-0 odd:bg-white even:bg-slate-50/80"
                    >
                      <dt className="col-span-5 font-display text-[12px] leading-4 font-medium break-words text-slate-600">
                        {spec.label.replace(/:\s*$/, "")}
                      </dt>
                      <dd className="col-span-7 font-display text-[12px] leading-4 font-semibold break-words text-slate-900">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {product.datasheet ? (
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[6px] border border-amber-200/70 bg-amber-50/70 px-[15px] py-[9px]">
                <a
                  href={product.datasheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center font-display text-[12px] leading-4 font-bold text-amber-900 underline-offset-2 hover:underline"
                >
                  <span aria-hidden="true" className="mr-2 flex size-4 shrink-0 items-center justify-center">
                    <DatasheetIcon className="h-[12.8px] w-[9.6px] text-leaf-600" />
                  </span>
                  Download OEM Datasheet (PDF)
                  <span className="sr-only">
                    {` — ${product.datasheet.name}${product.datasheet.size ? `, ${product.datasheet.size}` : ""} (opens in a new tab)`}
                  </span>
                </a>
                {copy.datasheetNote ? (
                  <p className="font-display text-[11px] leading-[16.5px] font-medium text-amber-800/80">
                    {copy.datasheetNote}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <RfqSection
            productSlug={product.slug}
            productName={product.name}
            title={copy.rfqTitle}
            subtitle={copy.rfqSubtitle}
            links={links}
            whatsappHref={links.enquiry(enquirySubject)}
            phoneDisplay={contact.phoneDisplay}
          />
        </div>
      </div>
    </div>
  );
}

/** Main photo in a clean white frame, with thumbnails when the product has a gallery. */
function ProductGallery({ product }: { product: CatalogueProduct }) {
  const images = product.image ? [product.image, ...product.gallery] : product.gallery;
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="rounded-[8px] border border-slate-100 bg-white p-[11px]">
        <div className={cn("relative aspect-[326/229] overflow-hidden rounded-[2px]", !current && "bg-surface")}>
          {current ? (
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="(min-width: 768px) 340px, 92vw"
              placeholder={current.placeholder}
              blurDataURL={current.blurDataURL}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <ImagePlaceholder label={product.brand?.short ?? "Ishita Traders"} />
          )}
        </div>
      </div>
      {images.length > 1 ? (
        <ul aria-label="Product photos" className="mt-2.5 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <li key={`${index}-${typeof image.src === "string" ? image.src : image.src.src}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-pressed={index === active}
                className={cn(
                  "relative block size-14 overflow-hidden rounded-[6px] border bg-white transition-[border-color,box-shadow]",
                  index === active
                    ? "border-navy-700 ring-2 ring-navy-700/15"
                    : "border-slate-200 hover:border-slate-400",
                )}
              >
                <Image src={image.src} alt="" fill sizes="56px" style={{ objectFit: "contain" }} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
