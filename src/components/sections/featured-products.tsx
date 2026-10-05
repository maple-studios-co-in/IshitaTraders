import Image from "next/image";

import { getCatalog } from "@/admin/content/catalog";
import { resolveImage } from "@/admin/content/images";
import type { PublicProduct } from "@/admin/content/public-types";
import { ArrowRightIcon, LongArrowIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-heading";
import { productLinks, sectionIds } from "@/config/navigation";
import { featuredSection } from "@/content/home";

/** Products marked "Featured" in Admin → Products, in their catalogue order. */
export async function FeaturedProducts() {
  const products = (await getCatalog()).products.filter((product) => product.isFeatured);
  if (products.length === 0) return null;

  return (
    <section id={sectionIds.featured} aria-labelledby="featured-title" className="bg-section-fade section-y">
      <div className="container-site">
        <Reveal>
          <SectionHeader
            titleId="featured-title"
            eyebrow={featuredSection.eyebrow}
            title={featuredSection.title}
            lead={featuredSection.lead}
          />
        </Reveal>

        <RevealGroup as="ul" className="mt-10 grid gap-[27px] md:grid-cols-2 lg:mt-[45px] lg:grid-cols-3">
          {products.map((product) => (
            <RevealItem as="li" key={product.id} className="flex">
              <ProductCard product={product} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="mt-10 flex justify-center lg:mt-[45px]">
          <ButtonLink
            href={featuredSection.viewAll.href}
            className="h-auto gap-2.5 rounded-[7px] px-8 py-3.5 font-display text-[15.8px] leading-[22.6px] font-semibold"
          >
            {featuredSection.viewAll.label}
            <ButtonArrow>
              <LongArrowIcon className="h-[3.7px] w-[9.4px]" />
            </ButtonArrow>
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function ProductCard({ product }: { product: PublicProduct }) {
  const image = resolveImage(product.image, product.name);
  const brandName = product.brand?.name.split(" ")[0] ?? "";
  const showPrice = product.price.show && product.price.price !== null;

  return (
    <article
      data-product-slug={product.slug}
      className="group flex w-full flex-col rounded-[9px] border border-slate-200 bg-white p-6 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_22px_40px_-26px_rgb(0_35_111/0.35)]"
    >
      <div className="relative h-[236px] overflow-hidden rounded-[4.5px] bg-[#f3f9fe]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 90vw"
            placeholder={image.placeholder}
            blurDataURL={image.blurDataURL}
            className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      {brandName ? (
        <p className="mt-1 font-display text-[12.4px] leading-[18.6px] font-bold text-leaf-600 uppercase">
          {brandName}
        </p>
      ) : null}
      <h3 className="pt-0.5 font-display text-[15.8px] leading-[22.6px] font-bold text-navy-950">{product.name}</h3>
      <p className="mt-1 max-w-[311px] text-[13.55px] leading-[18px] text-slate-500">
        {product.summary || product.description}
      </p>
      {showPrice ? (
        <p className="mt-2 font-display text-[15px] font-bold text-navy-900">
          {inr.format(product.price.price!)}
          {product.price.mrp && product.price.mrp > product.price.price! ? (
            <span className="ml-2 text-[12.5px] font-medium text-slate-400 line-through">
              {inr.format(product.price.mrp)}
            </span>
          ) : null}
          {product.price.note ? (
            <span className="ml-2 text-[12px] font-medium text-slate-500">{product.price.note}</span>
          ) : null}
        </p>
      ) : null}
      <div className="mt-auto pt-[34px]">
        <ButtonLink
          href={product.brand ? productLinks.brand(product.brand.slug) : productLinks.all}
          variant="soft"
          className="h-11 w-full gap-2 rounded-[4px] text-sm font-bold tracking-[0.01em]"
        >
          {brandName ? `View ${brandName} Products` : "View Products"}
          <ButtonArrow>
            <ArrowRightIcon className="size-3" />
          </ButtonArrow>
        </ButtonLink>
      </div>
    </article>
  );
}
