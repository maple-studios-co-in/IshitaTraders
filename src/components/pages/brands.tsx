import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { SmartLink } from "@/components/ui/smart-link";
import { productLinks } from "@/config/navigation";
import { brandProfiles, brandsIntro, whyBuyDirect, type BrandProfile } from "@/content/brands";
import { cn } from "@/lib/cn";

import { FigmaIcon } from "./figma-icons";

/** "Trusted Global & National Brands Under One Roof" with the four service promises (Figma 304:5046–5086). */
export function BrandsIntro() {
  return (
    <section aria-labelledby="brands-intro-title" className="bg-white pt-12 pb-10 lg:pt-16 lg:pb-[52px]">
      <div className="container-site flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <Reveal className="flex max-w-[812px] flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-2 font-jetbrains text-[12px] leading-[14.4px] font-semibold tracking-[0.02em]">
            <span className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 font-bold tracking-[0.05em] text-[#748f0f] uppercase">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#748f0f]" />
              {brandsIntro.badge}
            </span>
            <span aria-hidden="true" className="text-[#737685]">
              •
            </span>
            <span className="text-[#434654]">{brandsIntro.note}</span>
          </p>
          <h2
            id="brands-intro-title"
            className="font-display text-[clamp(1.75rem,1.35rem+1.5vw,2.25rem)] leading-[1.25] font-bold tracking-[-0.025em] text-[#191c1e]"
          >
            {brandsIntro.title.lead} <span className="font-normal text-[#003d9b]">{brandsIntro.title.accent}</span>
          </h2>
          <p className="max-w-[768px] font-hanken text-[16px] leading-[1.625] text-[#434654] sm:text-[18px]">
            {brandsIntro.description}
          </p>
        </Reveal>

        <RevealGroup
          as="ul"
          stagger={0.06}
          className="grid shrink-0 grid-cols-1 gap-x-10 gap-y-5 min-[420px]:grid-cols-2 lg:gap-x-12 lg:gap-y-6"
        >
          {brandsIntro.features.map((feature) => (
            <RevealItem as="li" key={feature.title} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#203c8a]">
                <FigmaIcon name={feature.icon} className="h-[19px] w-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-hanken text-[14px] leading-[17.5px] font-semibold tracking-[0.01em] text-[#191c1e]">
                  {feature.title}
                </span>
                <span className="font-jetbrains text-[12px] leading-[14.4px] font-semibold tracking-[0.02em] text-[#434654]">
                  {feature.detail}
                </span>
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/** The three dedicated brand blocks, photo and copy alternating sides (Figma 304:5095). */
export function BrandBlocks() {
  return (
    <section aria-label="Our brands" className="bg-white pb-12 lg:pb-[46px]">
      <div className="container-site flex flex-col gap-8 lg:gap-[46px]">
        {brandProfiles.map((brand) => (
          <BrandBlock key={brand.slug} brand={brand} />
        ))}
      </div>
    </section>
  );
}

function BrandBlock({ brand }: { brand: BrandProfile }) {
  const titleId = `brand-${brand.slug}-title`;
  return (
    <Reveal y={24}>
      <article
        id={brand.slug}
        aria-labelledby={titleId}
        className="grid overflow-hidden rounded-[28px] border border-[rgb(195_198_214/0.3)] bg-linear-to-b from-white to-[#eaf6fc] shadow-[0_1px_2px_rgb(0_0_0/0.05)] lg:grid-cols-12 lg:rounded-[37px]"
      >
        <div
          className={cn(
            "relative min-h-[260px] overflow-hidden bg-[#eceef0] sm:min-h-[340px] lg:col-span-5 lg:min-h-[443px]",
            brand.imageSide === "right" && "lg:order-2",
          )}
        >
          <Image
            src={brand.image.src}
            alt={brand.image.alt}
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            placeholder="blur"
            className="object-cover transition-transform duration-[1.2s] ease-out-expo hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-black/75 via-black/0 via-50% to-black/0"
          />
          <div className="absolute inset-x-[18px] bottom-[18px] flex flex-col">
            <span className="font-jetbrains text-[13px] leading-[16.8px] font-semibold tracking-[0.05em] text-[#34b1e2] uppercase sm:text-[14px]">
              {brand.caption.eyebrow}
            </span>
            <span className="font-hanken text-[20px] leading-[1.4] font-bold text-white sm:text-[23px]">
              {brand.caption.title}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-7 p-6 sm:p-9 lg:col-span-7 lg:p-[46px]">
          <div className="flex flex-col gap-[9px]">
            <div className="flex items-center gap-[9px]">
              <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-[#003d9b] font-hanken text-[23px] leading-none font-bold text-white">
                {brand.initial}
              </span>
              <span className="flex min-w-0 flex-col">
                <h2
                  id={titleId}
                  className="font-hanken text-[24px] leading-[1.3] font-bold tracking-[-0.01em] text-[#191c1e] sm:text-[28px]"
                >
                  {brand.name}
                </h2>
                <span className="font-jetbrains text-[13px] leading-[16.8px] font-semibold tracking-[0.02em] text-[#737685] sm:text-[14px]">
                  {brand.legalName}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-[9px]">
              <span className="rounded-full bg-[#748f0f] px-3.5 py-1 font-jetbrains text-[12px] leading-[16.8px] font-bold tracking-[0.02em] text-white sm:text-[14px]">
                {brand.badges[0]}
              </span>
              <span className="rounded-full bg-[#eceef0] px-3.5 py-1 font-jetbrains text-[12px] leading-[16.8px] font-semibold tracking-[0.02em] text-[#434654] sm:text-[14px]">
                {brand.badges[1]}
              </span>
            </div>
            <p className="font-hanken text-[16px] leading-[1.625] text-[#434654] sm:text-[18.66px]">
              {brand.description}
            </p>

            <div className="flex flex-col gap-[9px] py-[9px]">
              <h3 className="font-jetbrains text-[13px] leading-[16.8px] font-semibold tracking-[0.05em] text-[#737685] uppercase sm:text-[14px]">
                Key core offerings
              </h3>
              <ul className="grid gap-[9px] sm:grid-cols-2">
                {brand.offerings.map((offering) => (
                  <li key={offering} className="flex min-h-12 items-center gap-[9px] bg-[#f2f4f6] p-[11.66px]">
                    <FigmaIcon name="offeringCheck" className="h-[18px] w-[19px] shrink-0" />
                    <span className="font-hanken text-[15px] leading-[1.5] text-[#191c1e] sm:text-[16.3px]">
                      {offering}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="grid gap-x-6 gap-y-3 border border-[#dae2ff] bg-[rgb(218_226_255/0.3)] p-[12px] sm:grid-cols-[1fr_auto]">
              {brand.highlights.map((highlight) => (
                <li key={highlight.label} className="flex items-center gap-[9px]">
                  <FigmaIcon name={highlight.icon} className="h-5 w-4 shrink-0" />
                  <span className="font-jetbrains text-[13px] leading-[16.8px] font-semibold tracking-[0.02em] text-[#001848] sm:text-[14px]">
                    {highlight.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-[18px] border-t border-[rgb(195_198_214/0.3)] pt-5">
            <p className="font-hanken text-[15px] leading-[1.5] text-[#434654] sm:text-[16.3px]">{brand.note}</p>
            <SmartLink
              href={productLinks.brand(brand.slug)}
              className="group inline-flex items-center gap-[9px] rounded-full bg-[#003d9b] px-7 py-3 font-hanken text-[16.3px] leading-5 font-semibold tracking-[0.025em] text-white shadow-[0_1px_1px_rgb(0_0_0/0.05)] transition-colors duration-300 hover:bg-[#002f78]"
            >
              {brand.cta}
              <FigmaIcon
                name="arrowWhite"
                className="size-3.5 transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
              />
            </SmartLink>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/** "Why Buy Directly from Ishita Traders?" (Figma 304:5327). */
export function WhyBuyDirect() {
  return (
    <section
      aria-labelledby="why-buy-title"
      className="bg-linear-to-b from-white from-6% to-[#edf4fc] to-64% py-16 lg:pt-16 lg:pb-[72px]"
    >
      <div className="container-site flex flex-col items-center gap-7">
        <Reveal className="flex max-w-[789px] flex-col items-center gap-3 pt-1.5 text-center">
          <p className="font-display text-[14px] leading-[17px] font-bold tracking-[0.04em] text-[#748f0f] uppercase sm:text-[17px]">
            {whyBuyDirect.eyebrow}
          </p>
          <h2
            id="why-buy-title"
            className="font-hanken text-[clamp(1.75rem,1.2rem+1.9vw,2.56rem)] leading-[1.15] font-bold tracking-[-0.007em] text-[#191c1e]"
          >
            {whyBuyDirect.title}
          </h2>
          <p className="max-w-[760px] font-hanken text-[15px] leading-[1.54] text-[#434654] sm:text-[16px]">
            {whyBuyDirect.description}
          </p>
        </Reveal>

        <RevealGroup as="ul" stagger={0.08} className="grid w-full gap-5 md:grid-cols-3 lg:gap-7">
          {whyBuyDirect.cards.map((card) => (
            <RevealItem
              as="li"
              key={card.title}
              className="flex flex-col justify-between rounded-[20px] border border-[rgb(195_198_214/0.3)] bg-white p-6 shadow-[0_1px_1px_rgb(0_0_0/0.05)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-26px_rgb(0_35_111/0.35)] lg:p-[29px]"
            >
              <div className="flex flex-col gap-[9px]">
                <span className={cn("grid size-14 place-items-center rounded-full", card.tint)}>
                  <FigmaIcon name={card.icon} className="h-[26px] w-7" />
                </span>
                <h3 className="pt-1 font-hanken text-[21px] leading-[1.4] font-semibold text-[#191c1e] sm:text-[23.5px]">
                  {card.title}
                </h3>
                <p className="font-hanken text-[15px] leading-[1.625] text-[#434654] sm:text-[16.4px]">{card.text}</p>
              </div>
              <p className="mt-5 flex items-center gap-[9px] border-t border-[rgb(195_198_214/0.2)] pt-2.5">
                <FigmaIcon name={card.tagIcon} className="size-4 shrink-0" />
                <span
                  className={cn(
                    "font-jetbrains text-[13px] leading-[17px] font-semibold tracking-[0.02em] sm:text-[14px]",
                    card.tagColor,
                  )}
                >
                  {card.tag}
                </span>
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
