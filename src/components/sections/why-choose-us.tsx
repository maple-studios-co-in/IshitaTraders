import Image from "next/image";
import type { CSSProperties } from "react";

import { contactLinks, resolveLink } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Eyebrow, SectionTitle } from "@/components/ui/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import { whyUsSection } from "@/content/home";

export async function WhyChooseUs() {
  const links = contactLinks((await getSiteSettings()).contact);
  return (
    <section
      id={sectionIds.whyUs}
      aria-labelledby="why-title"
      className="relative isolate overflow-clip bg-navy-950 py-16 lg:pt-[91px] lg:pb-[128px]"
    >
      <Image
        src={whyUsSection.background.src}
        alt=""
        fill
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-bottom"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-b from-slate-950/45 via-slate-950/10 to-slate-950/20"
      />

      <div className="container-site">
        <Reveal className="flex max-w-[672px] flex-col gap-1">
          <Eyebrow tone="light" className="text-[12px] md:text-[11px]">
            {whyUsSection.eyebrow}
          </Eyebrow>
          <SectionTitle
            id="why-title"
            tone="light"
            className="text-[clamp(1.875rem,1.5rem+1vw,2.25rem)] leading-[1.22]"
          >
            {whyUsSection.title}
          </SectionTitle>
          <p className="text-sm leading-[22px] text-white">{whyUsSection.lead}</p>
        </Reveal>

        {/* Phones: the reasons stack like a deck — each card pins under the header as the next slides over it. */}
        <RevealGroup
          as="ul"
          className="mt-12 grid gap-7 max-md:mt-9 max-md:gap-5 md:grid-cols-2 lg:mt-[108px] lg:grid-cols-3 lg:gap-[27.9px]"
        >
          {whyUsSection.reasons.map((reason, index) => (
            <RevealItem
              as="li"
              key={reason.number}
              className="lift-trigger flex max-md:sticky max-md:top-[calc(var(--header-h)+1rem+var(--stack)*0.875rem)]"
              style={{ "--stack": index } as CSSProperties}
            >
              <article className="lift-card flex w-full flex-col justify-between gap-10 rounded-[9.3px] bg-surface p-7 shadow-card max-md:min-h-[19.5rem] max-md:gap-8 max-md:rounded-[1.25rem] max-md:p-6 max-md:shadow-[0_-18px_40px_-20px_rgb(0_0_0/0.55)] lg:min-h-[430px]">
                <div className="flex flex-col gap-[9.3px]">
                  <p
                    aria-hidden="true"
                    className="font-display text-[41.85px] leading-[51px] font-extrabold tracking-[-0.02em] text-[#c5c5d3]"
                  >
                    {reason.number}
                  </p>
                  <h3 className="font-display text-[20.9px] leading-[27.9px] font-bold text-navy-900 uppercase">
                    {reason.title}
                  </h3>
                  <p className="max-w-[420px] text-[13.95px] leading-[20.9px] text-body">{reason.description}</p>
                </div>
                <SmartLink
                  href={resolveLink(reason.pill.href, links)}
                  className="flex w-full max-w-[274.6px] items-center justify-center rounded-[17.6px] border-[1.5px] border-blue-300 px-6 py-4 text-center text-[12.8px] leading-4 font-semibold tracking-[0.04em] text-navy-900 transition-colors duration-300 hover:border-navy-800 hover:bg-navy-800 hover:text-white"
                >
                  {reason.pill.label}
                </SmartLink>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
