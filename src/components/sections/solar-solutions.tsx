import Image from "next/image";

import { contactLinks, resolveLink } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";

import { ArrowRightIcon, PlugIcon, SunFilledIcon, TrendDownIcon, VerifiedBadgeIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import { solarHomeBanner, solarSection, type BenefitIcon } from "@/content/home";

const benefitIcons: Record<BenefitIcon, { Icon: typeof SunFilledIcon; className: string }> = {
  sun: { Icon: SunFilledIcon, className: "size-[22.6px]" },
  plug: { Icon: PlugIcon, className: "h-[18.5px] w-[12.3px]" },
  trend: { Icon: TrendDownIcon, className: "h-[12.3px] w-[20.5px]" },
};

export function SolarSolutions() {
  return (
    <section id={sectionIds.solar} aria-labelledby="solar-title" className="bg-white section-y">
      <div className="container-site grid items-center gap-12 lg:grid-cols-[minmax(0,644fr)_minmax(0,725fr)] lg:gap-12">
        <Reveal className="relative">
          <figure className="relative aspect-644/641 overflow-hidden rounded-[10px] bg-surface-strong shadow-panel">
            <Image
              src={solarSection.image.src}
              alt={solarSection.image.alt}
              fill
              sizes="(min-width: 1024px) 644px, 92vw"
              placeholder="blur"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-5 bottom-5 flex items-center gap-2.5 rounded-[5px] bg-white/95 p-5 shadow-soft backdrop-blur-[5px]">
              <VerifiedBadgeIcon className="h-[25.9px] w-[27.1px] shrink-0 text-leaf-deep" />
              <span className="font-display text-lg leading-7 font-bold text-navy-900 sm:text-[22.2px]">
                {solarSection.badge}
              </span>
            </figcaption>
          </figure>
        </Reveal>

        <div className="flex flex-col gap-5">
          <Reveal className="flex flex-col gap-[5px]">
            <Eyebrow className="text-[13.6px] tracking-[0.1em]">{solarSection.eyebrow}</Eyebrow>
            <h2
              id="solar-title"
              className="font-display text-[clamp(2rem,1.4rem+1.8vw,2.77rem)] leading-[1.22] font-bold tracking-[-0.02em] text-navy-900"
            >
              {solarSection.title}
            </h2>
            <p className="text-lg leading-[1.62] text-body lg:text-[19.7px]">{solarSection.lead}</p>
          </Reveal>

          <RevealGroup as="ul" stagger={0.1} className="flex flex-col gap-5 pt-[5px]">
            {solarSection.benefits.map((benefit) => {
              const { Icon, className } = benefitIcons[benefit.icon];
              return (
                <RevealItem
                  as="li"
                  key={benefit.title}
                  className="flex items-start gap-5 rounded-[5px] bg-surface p-2.5 transition-colors duration-300 hover:bg-[#e8f2ff]"
                >
                  <span className="flex size-[49.3px] shrink-0 items-center justify-center rounded-[5px] bg-leaf-600 text-white">
                    <Icon className={className} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-xl leading-[29.6px] font-bold text-navy-900 sm:text-[22.2px]">
                      {benefit.title}
                    </span>
                    <span className="text-[14.8px] leading-[22.2px] text-body">{benefit.description}</span>
                  </span>
                </RevealItem>
              );
            })}
          </RevealGroup>

          <Reveal className="flex flex-wrap items-center gap-5 pt-2.5">
            <ButtonLink
              href={solarSection.primaryCta.href}
              className="h-auto rounded-[5px] px-[29.6px] py-[14.8px] text-[17.3px] leading-[24.65px] tracking-[0.01em]"
            >
              {solarSection.primaryCta.label}
            </ButtonLink>
            <SmartLink
              href={solarSection.secondaryCta.href}
              className="group/link inline-flex items-center gap-[5px] text-[17.3px] font-bold tracking-[0.01em] text-leaf-deep hover:text-leaf-600"
            >
              {solarSection.secondaryCta.label}
              <ButtonArrow>
                <ArrowRightIcon className="size-[13.3px]" />
              </ButtonArrow>
            </SmartLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export async function SolarHomeBanner() {
  const links = contactLinks((await getSiteSettings()).contact);
  return (
    <section aria-labelledby="solar-home-title" className="bg-brand-sweep py-12 lg:py-[71px]">
      <div className="container-site">
        <Reveal className="flex flex-col gap-6 rounded-[8px] bg-surface px-6 py-8 shadow-card sm:px-10 md:flex-row md:items-center md:justify-between lg:py-10 lg:pr-[79px] lg:pl-[92px]">
          <div className="flex max-w-[672px] flex-col gap-1">
            <h2
              id="solar-home-title"
              className="font-display text-2xl leading-8 font-bold tracking-[-0.01em] text-navy-900"
            >
              {solarHomeBanner.title}
            </h2>
            <p className="text-sm leading-[22px] text-body">{solarHomeBanner.description}</p>
          </div>
          <ButtonLink
            href={resolveLink(solarHomeBanner.cta.href, links)}
            variant="accent"
            className="h-auto gap-1 rounded-[4px] px-6 py-3 text-sm leading-5 tracking-[0.01em]"
          >
            {solarHomeBanner.cta.label}
            <ButtonArrow>
              <ArrowRightIcon className="size-3" />
            </ButtonArrow>
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
