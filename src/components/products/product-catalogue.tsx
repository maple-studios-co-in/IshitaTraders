"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { contactLinks } from "@/admin/content/links";
import { Reveal } from "@/components/motion/reveal";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { SearchIcon } from "./icons";
import { ProductCard, type OpenIntent } from "./product-card";
import { ProductDialog } from "./product-dialog";
import type { CatalogueProduct, CatalogueProps } from "./types";

/** Query parameters this page owns; anything else in the URL (utm_*, …) is left untouched. */
const PARAMS = { brand: "brand", q: "q", app: "app", product: "product" } as const;

interface Filters {
  brand: string;
  q: string;
  app: string;
  product: string;
}

/**
 * The interactive catalogue: brand tabs, search, application filter, the grid and the details
 * popup, all reflected in a shareable URL (?brand=…&q=…&app=…&product=…).
 */
export function ProductCatalogue(props: CatalogueProps) {
  const searchParams = useSearchParams();
  return <CatalogueBrowser {...props} initialQuery={searchParams.toString()} syncUrl />;
}

/**
 * Static HTML for the Suspense boundary around `useSearchParams`: the full, unfiltered grid, so
 * crawlers and visitors without JavaScript still get every published product.
 */
export function ProductCatalogueFallback(props: CatalogueProps) {
  return <CatalogueBrowser {...props} initialQuery="" syncUrl={false} />;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function readFilters(
  query: string,
  { products, brands, applications }: Pick<CatalogueProps, "products" | "brands" | "applications">,
): Filters {
  const params = new URLSearchParams(query);
  const brand = (params.get(PARAMS.brand) ?? "").trim().toLowerCase();
  const app = (params.get(PARAMS.app) ?? "").trim().toLowerCase();
  const product = (params.get(PARAMS.product) ?? "").trim();
  return {
    brand: brands.some((item) => item.slug === brand) ? brand : "",
    q: (params.get(PARAMS.q) ?? "").slice(0, 100),
    app: applications.find((item) => item.toLowerCase() === app) ?? "",
    product: products.some((item) => item.slug === product) ? product : "",
  };
}

/** Everything a visitor might type to find a product: name, model line, type, brand, SKU, specs, uses. */
function searchText(product: CatalogueProduct) {
  return normalize(
    [
      product.name,
      product.subtitle,
      product.typeLabel,
      product.brand?.name,
      product.category,
      product.sku,
      ...product.specs.flatMap((spec) => [spec.label, spec.value]),
      ...product.applications,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function CatalogueBrowser({
  initialQuery,
  syncUrl,
  products,
  brands,
  applications,
  copy,
  contact,
}: CatalogueProps & { initialQuery: string; syncUrl: boolean }) {
  const [filters, setFilters] = useState(() => readFilters(initialQuery, { products, brands, applications }));
  const [urlQuery, setUrlQuery] = useState(filters.q);
  const [intent, setIntent] = useState<OpenIntent>("details");
  const trigger = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const links = useMemo(() => contactLinks(contact), [contact]);

  const haystacks = useMemo(() => new Map(products.map((product) => [product.slug, searchText(product)])), [products]);
  const visible = useMemo(() => {
    const terms = normalize(filters.q).split(" ").filter(Boolean);
    const app = filters.app.toLowerCase();
    return products.filter((product) => {
      if (filters.brand && product.brand?.slug !== filters.brand) return false;
      if (app && !product.applications.some((item) => item.toLowerCase() === app)) return false;
      const haystack = haystacks.get(product.slug) ?? "";
      return terms.every((term) => haystack.includes(term));
    });
  }, [products, haystacks, filters.brand, filters.app, filters.q]);

  // Typing settles for a moment before the address bar follows.
  useEffect(() => {
    if (!syncUrl) return;
    const timer = window.setTimeout(() => setUrlQuery(filters.q), 300);
    return () => window.clearTimeout(timer);
  }, [filters.q, syncUrl]);

  // Mirror the filters into the URL without a navigation (Next.js keeps useSearchParams in sync).
  useEffect(() => {
    if (!syncUrl) return;
    const params = new URLSearchParams(window.location.search);
    const before = params.toString();
    Object.values(PARAMS).forEach((key) => params.delete(key));
    if (filters.brand) params.set(PARAMS.brand, filters.brand);
    if (urlQuery.trim()) params.set(PARAMS.q, urlQuery.trim());
    if (filters.app) params.set(PARAMS.app, filters.app);
    if (filters.product) params.set(PARAMS.product, filters.product);
    const next = params.toString();
    if (next === before) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`,
    );
  }, [syncUrl, filters.brand, filters.app, filters.product, urlQuery]);

  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    // Any other change writes the URL at once, so take pending search text along.
    if (!("q" in patch)) setUrlQuery(filters.q);
  };

  const openProduct = (slug: string, nextIntent: OpenIntent, from: HTMLElement) => {
    trigger.current = from;
    setIntent(nextIntent);
    update({ product: slug });
  };

  // Back to where the visitor was: the card button or title that opened the popup.
  const closeProduct = () => {
    setFilters((current) => (current.product ? { ...current, product: "" } : current));
    const from = trigger.current;
    trigger.current = null;
    if (from?.isConnected) from.focus({ preventScroll: true });
  };

  const resetFilters = () => {
    setFilters((current) => ({ ...current, brand: "", q: "", app: "" }));
    setUrlQuery("");
    searchInput.current?.focus();
  };

  const openProductData = products.find((product) => product.slug === filters.product) ?? null;
  const brandName = brands.find((brand) => brand.slug === filters.brand)?.name;
  const total = products.length;

  return (
    <section aria-labelledby="catalogue-heading" className="container-site pb-3 lg:pb-[11px]">
      <h2 id="catalogue-heading" className="sr-only">
        Product catalogue
      </h2>

      <Reveal y={16} className="pt-8 lg:pt-[59px]">
        <div
          id="catalogue-filters"
          role="search"
          aria-label="Search and filter products"
          className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between"
        >
          <div role="group" aria-label="Brand" className="flex flex-wrap gap-2.5">
            <BrandTab active={!filters.brand} onClick={() => update({ brand: "" })}>
              All Brands
            </BrandTab>
            {brands.map((brand) => (
              <BrandTab
                key={brand.slug}
                active={filters.brand === brand.slug}
                onClick={() => update({ brand: brand.slug })}
              >
                {brand.tabLabel}
              </BrandTab>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row lg:ml-auto">
            <div className="relative sm:flex-1 lg:w-[312px] lg:flex-none">
              <label htmlFor="product-search" className="sr-only">
                Search products
              </label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-[15px] size-[13.5px] -translate-y-1/2 text-[#757682]" />
              <input
                ref={searchInput}
                id="product-search"
                type="search"
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
                maxLength={100}
                placeholder={copy.searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="h-11 w-full rounded-[4.9px] border border-transparent bg-surface pr-[14.6px] pl-[43.9px] text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#757682] hover:bg-surface-strong focus:border-navy-800 focus:bg-white focus:ring-4 focus:ring-navy-800/10 focus:outline-none sm:h-[41.2px] sm:text-[14.6px]"
              />
            </div>
            <div className="relative sm:w-[189px]">
              <label htmlFor="product-application" className="sr-only">
                Application
              </label>
              <select
                id="product-application"
                value={filters.app}
                onChange={(event) => update({ app: event.target.value })}
                className="h-11 w-full cursor-pointer appearance-none rounded-[4.9px] bg-navy-950 pr-[34px] pl-[19.5px] text-base tracking-[0.02em] text-white transition-colors hover:bg-navy-900 focus-visible:outline-offset-2 sm:h-[41px] sm:text-[14.6px]"
              >
                <option value="">All Applications</option>
                {applications.map((application) => (
                  <option key={application} value={application}>
                    {application}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white/80"
              />
            </div>
          </div>
        </div>
      </Reveal>

      <p role="status" className="sr-only">
        {visible.length === total ? `Showing all ${total} products` : `Showing ${visible.length} of ${total} products`}
      </p>

      {visible.length > 0 ? (
        <ul id="product-grid" className="mt-8 grid gap-[19px] sm:grid-cols-2 lg:mt-[55px] lg:grid-cols-3">
          {visible.map((product, index) => (
            <Reveal as="li" key={product.slug} delay={(index % 3) * 0.06} className="flex min-w-0">
              <ProductCard
                product={product}
                ctaLabel={copy.ctaLabel}
                enquiryHref={links.enquiry(product.name)}
                onOpen={openProduct}
              />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div
          data-track-context="products-empty"
          className="mt-8 flex flex-col items-center rounded-[12px] border border-dashed border-slate-300 bg-surface px-6 py-14 text-center lg:mt-[55px]"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-navy-800 shadow-card">
            <SearchIcon className="size-5" />
          </span>
          <h3 className="mt-5 font-display text-xl font-bold text-navy-900">
            {total > 0 ? "No products match these filters" : "Our catalogue is being updated"}
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-body">
            {total > 0
              ? "Try fewer words or another brand — or ask us directly. Our depot stocks more models than we list here."
              : "New stock is on its way online. Ask us on WhatsApp for current models, prices and availability."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {total > 0 ? <Button onClick={resetFilters}>Reset filters</Button> : null}
            <ButtonLink
              href={links.whatsapp(enquiryMessage(filters, brandName))}
              variant="outline"
              aria-label="Ask on WhatsApp (opens in a new tab)"
              className="gap-2 pl-3"
            >
              <Image src={whatsappLogo} alt="" width={26} height={26} className="size-[26px]" />
              Ask on WhatsApp
            </ButtonLink>
          </div>
        </div>
      )}

      <ProductDialog
        product={openProductData}
        intent={intent}
        copy={copy}
        contact={contact}
        links={links}
        onClose={closeProduct}
      />
    </section>
  );
}

function enquiryMessage(filters: Filters, brandName?: string) {
  const what = filters.q.trim() ? `“${filters.q.trim()}”` : "a product";
  const from = brandName ? ` from ${brandName}` : "";
  const use = filters.app ? ` for ${filters.app.toLowerCase()} use` : "";
  return `Hi Ishita Traders, I'm looking for ${what}${from}${use}. Could you share the options, price and availability?`;
}

function BrandTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[42px] items-center justify-center rounded-[4.9px] px-4 text-[15px] leading-[24.4px] tracking-[0.01em] whitespace-nowrap transition-colors duration-200 max-sm:grow sm:h-[44.5px] sm:px-[19.5px] sm:text-[17.1px]",
        active ? "bg-navy-900 font-bold text-white" : "bg-surface font-semibold text-ink hover:bg-surface-strong",
      )}
    >
      {children}
    </button>
  );
}
