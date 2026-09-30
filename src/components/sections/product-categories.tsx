import Image from "next/image";

import { ArrowRightIcon, ChevronRightIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import { inventorySection, type ProductCategory } from "@/content/home";

export function ProductCategories() {
  const { viewAll } = inventorySection;

  return (
    <section id={sectionIds.products} aria-labelledby="products-title" className="bg-section-fade section-y">
      <div className="container-site">
        <Reveal>
          <SectionHeader
            titleId="products-title"
            eyebrow={inventorySection.eyebrow}
            title={inventorySection.title}
            lead={inventorySection.lead}
            action={
              <SmartLink
                href={viewAll.href}
                className="group/link inline-flex items-center gap-1.5 text-base font-bold tracking-[0.01em] text-navy-900 hover:text-brand-600"
              >
                {viewAll.label}
                <ButtonArrow>
                  <ArrowRightIcon className="size-3" />
                </ButtonArrow>
              </SmartLink>
            }
          />
        </Reveal>

        <RevealGroup as="ul" stagger={0.08} className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {inventorySection.categories.map((item) => (
            <RevealItem as="li" key={item.title} className="flex">
              <CategoryCard item={item} ctaLabel={inventorySection.ctaLabel} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function CategoryCard({ item, ctaLabel }: { item: ProductCategory; ctaLabel: string }) {
  return (
    <article className="group relative flex w-full flex-col rounded-[9px] bg-white p-[18px] shadow-card transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgb(0_35_111/0.35)]">
      <div className="relative h-[203px] overflow-hidden rounded-[5px] bg-surface-strong">
        <Image
          src={item.image.src}
          alt={item.image.alt}
          fill
          sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 90vw"
          placeholder="blur"
          className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      </div>
      <p className="mt-[9px] text-[12.7px] leading-4 font-bold tracking-[0.05em] text-leaf-600 uppercase">
        {item.category}
      </p>
      <h3 className="mt-[9px] font-display text-[20.7px] leading-7 font-bold text-ink">{item.title}</h3>
      <p className="mt-[9px] text-[13.8px] leading-[20.7px] text-body">{item.description}</p>

      <div className="mt-auto pt-[18px]">
        <SmartLink
          href={item.href}
          className="group/link flex items-center justify-between text-[13.8px] leading-[18.4px] font-bold tracking-[0.02em] text-navy-900 after:absolute after:inset-0 after:rounded-[9px] hover:text-brand-600"
          aria-label={`${ctaLabel} — ${item.title}`}
        >
          {ctaLabel}
          <ButtonArrow>
            <ChevronRightIcon className="h-[11.5px] w-[7.1px]" />
          </ButtonArrow>
        </SmartLink>
      </div>
    </article>
  );
}
