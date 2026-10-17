import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { getCatalog } from "@/admin/content/catalog";
import { getRoutingTable } from "@/admin/content/content";
import { imageUrl, resolveImage } from "@/admin/content/images";
import type { PublicProduct } from "@/admin/content/public-types";
import { getSiteSettings } from "@/admin/content/settings";
import type { StockStatus } from "@/admin/content/types";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { toCatalogueProduct } from "@/components/products/catalogue-data";
import { productHref } from "@/components/products/product-card";
import { ProductPageDetails } from "@/components/products/product-page-details";
import { siteConfig } from "@/config/site";
import { omit } from "@/admin/lib/object";

/** Product pages are built on first visit and cached; admin edits refresh them immediately (cache tags). */
export const revalidate = 3600;

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((product) => ({ slug: product.slug }));
}

async function findProduct(slug: string) {
  const { products } = await getCatalog();
  return products.find((product) => product.slug === decodeURIComponent(slug)) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [product, { business, seo }] = await Promise.all([findProduct((await params).slug), getSiteSettings()]);
  if (!product) return { title: "Product not found", robots: { index: false } };

  const title = product.seo.title || [product.name, product.brand?.name].filter(Boolean).join(" — ");
  const description =
    product.seo.description ||
    [
      product.summary || product.description,
      product.subtitle,
      `Get the dealer price from ${business.name}, ${business.address.locality || "Bihar"}.`,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 300);
  const path = productHref(product.slug);
  const image = imageUrl(product.image) ?? (seo.ogImage ? imageUrl(seo.ogImage) : null) ?? "/og.jpg";

  return {
    // A custom SEO title is used exactly as written; otherwise the site's "… | Ishita Traders" pattern applies.
    title: product.seo.title ? { absolute: product.seo.title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: business.name,
      url: path,
      title: product.seo.title || seo.titleTemplate.replace("%s", title),
      description,
      images: [{ url: image, alt: product.image?.alt || product.name }],
    },
    twitter: { card: "summary_large_image", title: product.seo.title || title, description, images: [image] },
  };
}

const availability: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  on_order: "https://schema.org/BackOrder",
  out_of_stock: "https://schema.org/OutOfStock",
};

function ProductStructuredData({ product, businessName }: { product: PublicProduct; businessName: string }) {
  const url = `${siteConfig.url}${productHref(product.slug)}`;
  const images = [product.image, ...product.gallery]
    .map((ref) => imageUrl(ref))
    .filter((src): src is string => Boolean(src))
    .map((src) => new URL(src, siteConfig.url).toString());
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: product.name,
      url,
      image: images.length ? images : undefined,
      description: product.description || product.summary || undefined,
      sku: product.sku || undefined,
      mpn: product.sku || undefined,
      category: product.category?.name,
      brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
      additionalProperty: product.specs.map((spec) => ({
        "@type": "PropertyValue",
        name: spec.label.replace(/:\s*$/, ""),
        value: spec.value,
      })),
      offers:
        product.price.show && product.price.price !== null
          ? {
              "@type": "Offer",
              url,
              price: product.price.price,
              priceCurrency: "INR",
              availability: availability[product.stockStatus],
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: businessName, "@id": `${siteConfig.url}/#business` },
            }
          : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Products", item: `${siteConfig.url}/products` },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings, catalog] = await Promise.all([findProduct(slug), getSiteSettings(), getCatalog()]);
  if (!product) {
    // A renamed product: send old links to its new address.
    const moved = (await getRoutingTable()).redirects.find(
      (item) => item.source === `/products/${decodeURIComponent(slug)}`,
    );
    if (moved) permanentRedirect(moved.destination);
    notFound();
  }

  const copy = omit(settings.catalogue, ["bannerImage"]);
  // Same brand first, then same category, never the product itself.
  const related = catalog.products
    .filter((item) => item.slug !== product.slug)
    .map((item) => ({
      item,
      score:
        (item.brand?.slug === product.brand?.slug ? 2 : 0) + (item.category?.slug === product.category?.slug ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);

  return (
    <>
      <ProductStructuredData product={product} businessName={settings.business.name} />
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="bg-section-fade pb-16 outline-none">
        <div className="container-site max-w-[1040px] pt-8 lg:pt-12">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
              <li>
                <Link href="/" className="hover:text-navy-800">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/products" className="hover:text-navy-800">
                  Products
                </Link>
              </li>
              {product.brand ? (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link
                      href={`/products?brand=${encodeURIComponent(product.brand.slug)}`}
                      className="hover:text-navy-800"
                    >
                      {product.brand.name}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="max-w-[60ch] truncate font-medium text-navy-900">
                {product.name}
              </li>
            </ol>
          </nav>
          <article
            aria-labelledby="product-title"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgb(0_35_111/0.45)]"
          >
            <ProductPageDetails product={toCatalogueProduct(product)} copy={copy} contact={settings.contact} />
          </article>

          {related.length ? (
            <section aria-labelledby="related-title" className="mt-12">
              <h2 id="related-title" className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
                Related products
              </h2>
              <ul className="mt-5 grid gap-5 sm:grid-cols-3">
                {related.map((item) => {
                  const image = resolveImage(item.image, item.name);
                  return (
                    <li key={item.slug}>
                      <Link
                        href={productHref(item.slug)}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-26px_rgb(0_35_111/0.35)]"
                      >
                        <span className="relative block h-40 bg-surface">
                          {image ? (
                            <Image
                              src={image.src}
                              alt={image.alt}
                              fill
                              sizes="(min-width: 640px) 320px, 92vw"
                              className="object-contain p-5"
                              placeholder={image.placeholder}
                              blurDataURL={image.blurDataURL}
                            />
                          ) : null}
                        </span>
                        <span className="flex flex-1 flex-col gap-1 p-4">
                          {item.typeLabel ? (
                            <span className="text-xs font-bold tracking-[0.04em] text-leaf-600 uppercase">
                              {item.typeLabel}
                            </span>
                          ) : null}
                          <span className="font-display text-base leading-snug font-bold text-ink group-hover:text-navy-800">
                            {item.name}
                          </span>
                          {item.subtitle ? <span className="text-sm text-body">{item.subtitle}</span> : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <p className="mt-10 text-center">
            <Link
              href="/products"
              className="font-display text-sm font-bold text-navy-800 underline-offset-4 hover:underline"
            >
              ← Back to the full catalogue
            </Link>
          </p>
        </div>
        <div className="mt-16">
          <FinalCta onHomepage={false} />
        </div>
      </main>
      <SiteFooter onHomepage={false} />
    </>
  );
}
