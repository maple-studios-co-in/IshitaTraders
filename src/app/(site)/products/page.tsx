import type { Metadata } from "next";
import { Suspense } from "react";

import { getCatalog } from "@/admin/content/catalog";
import { imageUrl, resolveImage } from "@/admin/content/images";
import type { PublicProduct } from "@/admin/content/public-types";
import { getSiteSettings } from "@/admin/content/settings";
import type { StockStatus } from "@/admin/content/types";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CatalogueBanner } from "@/components/products/catalogue-banner";
import { catalogueApplications, toCatalogueBrands, toCatalogueProduct } from "@/components/products/catalogue-data";
import { ProductCatalogue, ProductCatalogueFallback } from "@/components/products/product-catalogue";
import type { CatalogueProps } from "@/components/products/types";
import { Faq } from "@/components/sections/faq";
import { siteConfig } from "@/config/site";

/** Rebuilt hourly at most; admin changes to products or settings refresh it immediately (cache tags). */
export const revalidate = 3600;

const PATH = "/products";

const listFormat = new Intl.ListFormat("en-IN", { style: "long", type: "conjunction" });

export async function generateMetadata(): Promise<Metadata> {
  const [{ seo, business }, { brands }] = await Promise.all([getSiteSettings(), getCatalog()]);
  const title = "Products";
  const brandList = brands.length > 0 ? listFormat.format(brands.map((brand) => brand.name)) : "branded";
  const description = `Genuine ${brandList} batteries, solar inverters, PCUs and online UPS at ${business.name}, ${business.address.locality || "Bihar"}. Compare specs and request dealer prices.`;
  const socialTitle = seo.titleTemplate.replace("%s", title);
  // `openGraph` replaces the root layout's object as a whole, so restate the shared fields.
  const ogImage = seo.ogImage
    ? { url: imageUrl(seo.ogImage) ?? "/og.jpg", alt: seo.ogImage.alt || seo.title }
    : { url: "/og.jpg", width: 1200, height: 630, alt: seo.title };

  return {
    title,
    description,
    alternates: { canonical: PATH },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: business.name,
      url: PATH,
      title: socialTitle,
      description,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [ogImage.url] },
  };
}

const availability: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  on_order: "https://schema.org/BackOrder",
  out_of_stock: "https://schema.org/OutOfStock",
};

function CatalogueStructuredData({ products, businessName }: { products: PublicProduct[]; businessName: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteConfig.url}${PATH}#catalogue`,
    name: `${businessName} product catalogue`,
    url: `${siteConfig.url}${PATH}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const url = `${siteConfig.url}${PATH}/${encodeURIComponent(product.slug)}`;
      const image = imageUrl(product.image);
      const { price } = product;
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          url,
          image: image ? new URL(image, siteConfig.url).toString() : undefined,
          description: product.summary || product.description || undefined,
          sku: product.sku || undefined,
          category: product.category?.name,
          brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
          offers:
            price.show && price.price !== null
              ? {
                  "@type": "Offer",
                  url,
                  price: price.price,
                  priceCurrency: "INR",
                  availability: availability[product.stockStatus],
                  seller: { "@type": "Organization", name: businessName },
                }
              : undefined,
        },
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for "<" so it can't break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Without JavaScript the filters can't work and the scroll reveal never runs: hide the one, show the other. */
const NO_SCRIPT_CSS = "#catalogue-filters{display:none}#product-grid>li{opacity:1!important;transform:none!important}";

export default async function ProductsPage() {
  const [settings, catalog] = await Promise.all([getSiteSettings(), getCatalog()]);
  const { bannerImage, ...copy } = settings.catalogue;
  const brandNames = catalog.brands.map((brand) => brand.name);

  const catalogue: CatalogueProps = {
    products: catalog.products.map(toCatalogueProduct),
    brands: toCatalogueBrands(catalog),
    applications: catalogueApplications(catalog.products),
    copy,
    contact: settings.contact,
  };

  return (
    <>
      <CatalogueStructuredData products={catalog.products} businessName={settings.business.name} />
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="outline-none">
        <noscript>
          <style>{NO_SCRIPT_CSS}</style>
        </noscript>
        <CatalogueBanner
          image={resolveImage(bannerImage, "Exide, Microtek and UTL Solar products")}
          title={brandNames.length > 0 ? `Product catalogue — ${listFormat.format(brandNames)}` : "Product catalogue"}
        />
        <Suspense fallback={<ProductCatalogueFallback {...catalogue} />}>
          <ProductCatalogue {...catalogue} />
        </Suspense>
        <Faq />
        <FinalCta onHomepage={false} />
      </main>
      <SiteFooter onHomepage={false} />
    </>
  );
}
