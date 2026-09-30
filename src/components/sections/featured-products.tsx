import Image from "next/image";

import { ArrowRightIcon, LongArrowIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-heading";
import { sectionIds } from "@/config/navigation";
import { featuredSection, type FeaturedProduct } from "@/content/home";

export function FeaturedProducts() {
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
          {featuredSection.products.map((product) => (
            <RevealItem as="li" key={product.name} className="flex">
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

function ProductCard({ product }: { product: FeaturedProduct }) {
  return (
    <article className="group flex w-full flex-col rounded-[9px] border border-slate-200 bg-white p-6 transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_22px_40px_-26px_rgb(0_35_111/0.35)]">
      <div className="relative h-[236px] overflow-hidden rounded-[4.5px] bg-[#f3f9fe]">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 45vw, 90vw"
          placeholder="blur"
          className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      </div>
      <p className="mt-1 font-display text-[12.4px] leading-[18.6px] font-bold text-leaf-600 uppercase">
        {product.brand}
      </p>
      <h3 className="pt-0.5 font-display text-[15.8px] leading-[22.6px] font-bold text-navy-950">{product.name}</h3>
      <p className="mt-1 max-w-[311px] text-[13.55px] leading-[18px] text-slate-500">{product.description}</p>
      <div className="mt-auto pt-[34px]">
        <ButtonLink
          href={product.cta.href}
          variant="soft"
          className="h-11 w-full gap-2 rounded-[4px] text-sm font-bold tracking-[0.01em]"
        >
          {product.cta.label}
          <ButtonArrow>
            <ArrowRightIcon className="size-3" />
          </ButtonArrow>
        </ButtonLink>
      </div>
    </article>
  );
}
