import Image from "next/image";

import { getCatalog } from "@/admin/content/catalog";
import { resolveImage } from "@/admin/content/images";
import { contactLinks } from "@/admin/content/links";
import type { PublicCategory } from "@/admin/content/public-types";
import { getSiteSettings } from "@/admin/content/settings";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import { inventorySection } from "@/content/home";

/** "What We Provide": the categories marked "Show on homepage" in Admin → Brands & categories. */
export async function ProductCategories() {
  const [{ categories }, { contact }] = await Promise.all([getCatalog(), getSiteSettings()]);
  const visible = categories.filter((category) => category.showOnHomepage);
  if (visible.length === 0) return null;
  const links = contactLinks(contact);
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
          {visible.map((item) => (
            <RevealItem as="li" key={item.id} className="flex">
              <CategoryCard
                item={item}
                ctaLabel={inventorySection.ctaLabel}
                href={links.enquiry(item.enquirySubject)}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function CategoryCard({ item, ctaLabel, href }: { item: PublicCategory; ctaLabel: string; href: string }) {
  const image = resolveImage(item.image, item.name);
  return (
    <article
      data-track-context={`category:${item.slug}`}
      className="group relative flex w-full flex-col rounded-[9px] bg-white p-[18px] shadow-card transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgb(0_35_111/0.35)]"
    >
      <div className="relative h-[203px] overflow-hidden rounded-[5px] bg-surface-strong">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 90vw"
            placeholder={image.placeholder}
            blurDataURL={image.blurDataURL}
            className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <p className="mt-[9px] text-[12.7px] leading-4 font-bold tracking-[0.05em] text-leaf-600 uppercase">
        {item.label}
      </p>
      <h3 className="mt-[9px] font-display text-[20.7px] leading-7 font-bold text-ink">{item.name}</h3>
      <p className="mt-[9px] text-[13.8px] leading-[20.7px] text-body">{item.description}</p>

      <div className="mt-auto pt-[18px]">
        <SmartLink
          href={href}
          className="group/link flex items-center justify-between text-[13.8px] leading-[18.4px] font-bold tracking-[0.02em] text-navy-900 after:absolute after:inset-0 after:rounded-[9px] hover:text-brand-600"
          aria-label={`${ctaLabel} — ${item.name}`}
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
