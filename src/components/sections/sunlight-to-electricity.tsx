import Image from "next/image";

import { getSiteSettings } from "@/admin/content/settings";

import {
  ArrowRoundIcon,
  GearIcon,
  LeafIcon,
  PanelPatternIcon,
  RupeeHandIcon,
  SproutFolderIcon,
} from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { sunlightSection, type EnergyFeatureIcon } from "@/content/home";

import { VideoTourButton } from "./video-tour-button";

const featureIcons: Record<EnergyFeatureIcon, typeof LeafIcon> = {
  leaf: LeafIcon,
  rupee: RupeeHandIcon,
  gear: GearIcon,
  sprout: SproutFolderIcon,
};

export async function SunlightToElectricity() {
  const { homepage } = await getSiteSettings();
  return (
    <section
      aria-labelledby="sunlight-title"
      className="relative isolate overflow-hidden bg-[linear-gradient(90deg,#1e3b8b_24%,#2860bd_76%)] py-16 lg:py-[68px]"
    >
      <PanelPatternIcon className="pointer-events-none absolute top-[50px] left-[2.5%] -z-10 size-[clamp(14rem,24vw,24rem)] text-white opacity-10" />
      <svg
        aria-hidden="true"
        viewBox="0 0 320 128"
        className="pointer-events-none absolute -bottom-1.5 left-0 -z-10 h-24 w-60 -scale-x-100 sm:h-32 sm:w-80"
      >
        <path d="M20 128C120 70 200 120 320 10V128H20" fill="#748F0F" />
        <path d="M140 128C210 90 260 110 320 40V128H140" fill="#99F050" fillOpacity={0.4} />
      </svg>

      <div className="container-site grid items-center gap-12 lg:grid-cols-[minmax(0,600px)_minmax(0,820px)] lg:justify-between lg:gap-10">
        <div className="flex flex-col lg:pt-10">
          <Reveal className="flex items-center gap-[15px] pb-6">
            <p className="font-display text-[15px] leading-[24.5px] font-semibold tracking-[0.22em] text-white/95 uppercase sm:text-[17.2px]">
              {sunlightSection.eyebrow}
            </p>
            <span aria-hidden="true" className="h-[1.8px] w-[68.7px] rounded-full bg-white/40" />
          </Reveal>

          <Reveal delay={0.05}>
            <h2
              id="sunlight-title"
              className="font-outfit text-[clamp(2.75rem,1.6rem+3.3vw,4rem)] leading-none font-extrabold tracking-[-0.025em] text-white"
            >
              <span className="block">{sunlightSection.titleLines[0]}</span>
              <span className="block text-leaf-600 drop-shadow-[0_1.2px_0.6px_rgb(0_0_0/0.05)]">
                {sunlightSection.titleLines[1]}
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.1} className="pt-[29px] pb-12">
            <p className="max-w-[598px] font-display text-lg leading-[1.5] text-slate-200 opacity-90 lg:text-[19.6px] lg:leading-[29.45px]">
              {sunlightSection.description}
            </p>
          </Reveal>

          <RevealGroup
            as="ul"
            stagger={0.08}
            className="grid max-w-[598px] grid-cols-2 gap-y-8 sm:grid-cols-4 sm:gap-x-5"
          >
            {sunlightSection.features.map((feature) => {
              const Icon = featureIcons[feature.icon];
              return (
                <RevealItem as="li" key={feature.icon} className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-[78.5px] items-center justify-center rounded-full border border-white/35 bg-white/10 text-white shadow-soft backdrop-blur-[2.5px] transition-colors duration-300 hover:bg-white/20">
                    <Icon className="size-[34.4px]" />
                  </span>
                  <span className="font-display text-[14.7px] leading-[18.4px] font-medium text-white/95">
                    {feature.label[0]}
                    <br />
                    {feature.label[1]}
                  </span>
                </RevealItem>
              );
            })}
          </RevealGroup>

          <Reveal delay={0.1} className="pt-12">
            <ButtonLink
              href={sunlightSection.cta.href}
              variant="white"
              className="h-auto gap-[15px] rounded-full px-[39px] py-[17px] font-display text-lg leading-[29.45px] font-bold text-[#053176] shadow-float hover:bg-white hover:shadow-[0_30px_40px_-10px_rgb(0_0_0/0.25)] lg:text-[19.6px]"
            >
              {sunlightSection.cta.label}
              <ButtonArrow>
                <ArrowRoundIcon className="size-[24.5px]" />
              </ButtonArrow>
            </ButtonLink>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="relative aspect-820/812 overflow-hidden rounded-[11px] bg-white shadow-float">
            <Image
              src={sunlightSection.image.src}
              alt={sunlightSection.image.alt}
              fill
              sizes="(min-width: 1024px) 820px, 92vw"
              placeholder="blur"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoTourButton videoUrl={homepage.solarTourVideoUrl || undefined} label={sunlightSection.videoLabel} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
