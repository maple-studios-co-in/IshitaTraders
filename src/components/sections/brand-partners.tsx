import Image from "next/image";

import { ArrowStrokeIcon, BoltIcon, CogIcon, HomeIcon, SunIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-heading";
import { sectionIds } from "@/config/navigation";
import { brandsSection, type BrandPartner, type FeatureIcon } from "@/content/home";

const featureIcons: Record<FeatureIcon, typeof BoltIcon> = {
  bolt: BoltIcon,
  home: HomeIcon,
  sun: SunIcon,
  cog: CogIcon,
};

export function BrandPartners() {
  return (
    <section
      id={sectionIds.brands}
      aria-labelledby="brands-title"
      className="bg-linear-to-b from-white to-[#e9f6fc] section-y"
    >
      <div className="container-site">
        <Reveal>
          <SectionHeader
            titleId="brands-title"
            eyebrow={brandsSection.eyebrow}
            title={brandsSection.title}
            lead={brandsSection.lead}
          />
        </Reveal>

        <RevealGroup as="ul" className="mt-12 grid gap-8 md:grid-cols-2 lg:mt-[76px] lg:grid-cols-3 lg:gap-[42px]">
          {brandsSection.brands.map((brand) => (
            <RevealItem as="li" key={brand.name} className="flex">
              <BrandCard brand={brand} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function BrandCard({ brand }: { brand: BrandPartner }) {
  return (
    <article className="group flex w-full flex-col rounded-[18px] bg-white p-[26px] pt-[29px] transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-28px_rgb(30_58_138/0.45)]">
      <div className="relative aspect-380/293 overflow-hidden rounded-[18px] bg-slate-400">
        <Image
          src={brand.image.src}
          alt={brand.image.alt}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 90vw"
          placeholder="blur"
          className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      </div>

      <h3 className="sr-only">{brand.name}</h3>
      <ul className="mt-7 flex flex-col gap-[9px]">
        {brand.features.map((feature) => {
          const Icon = featureIcons[feature.icon];
          return (
            <li key={feature.label} className="flex items-center gap-[13px]">
              <span className="flex size-[30.5px] items-center justify-center rounded-full bg-blue-50 text-navy-700">
                <Icon className="size-[15.3px]" />
              </span>
              <span className="font-display text-[14.3px] leading-[21.5px] font-medium text-slate-700">
                {feature.label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6">
        <ButtonLink
          href={brand.cta.href}
          className="h-[46px] w-full gap-2 rounded-[11.5px] font-display text-[15.3px] font-bold"
        >
          {brand.cta.label}
          <ButtonArrow>
            <ArrowStrokeIcon className="size-[15.3px]" />
          </ButtonArrow>
        </ButtonLink>
      </div>
    </article>
  );
}
