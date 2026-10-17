import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { RailProgress } from "@/components/ui/rail-progress";
import { sectionIds } from "@/config/navigation";
import { installationsSection } from "@/content/home";

export function Installations() {
  return (
    <section id={sectionIds.installations} aria-labelledby="installations-title" className="bg-section-fade section-y">
      <div className="container-site">
        <Reveal className="flex max-w-[776px] flex-col gap-[9px]">
          <h2
            id="installations-title"
            className="font-display text-[clamp(1.75rem,1.3rem+1.3vw,2.16rem)] leading-[1.2] font-extrabold text-navy-950"
          >
            {installationsSection.title}
          </h2>
          <p className="text-[17px] leading-[27.7px] text-slate-600 sm:text-[18.5px]">{installationsSection.lead}</p>
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-10 grid gap-8 max-md:mobile-rail max-md:mt-8 max-md:[--rail-item:min(80%,20rem)] md:grid-cols-2 lg:mt-[55px] lg:grid-cols-3 lg:gap-[37px]"
        >
          {installationsSection.items.map((item) => (
            <RevealItem as="li" key={item.title} className="flex">
              <article className="group flex w-full flex-col overflow-hidden rounded-[9.2px] border border-slate-200 bg-white p-px shadow-soft transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_24px_44px_-28px_rgb(15_39_74/0.45)] max-md:relative max-md:isolate max-md:min-h-[27rem] max-md:justify-end max-md:rounded-[1.25rem] max-md:border-0 max-md:bg-[#06102a] max-md:p-0 max-md:shadow-[0_24px_48px_-26px_rgb(6_16_42/0.75)]">
                <div className="relative h-[277px] overflow-hidden rounded-t-[8.2px] bg-slate-100 max-md:absolute max-md:inset-0 max-md:-z-10 max-md:h-auto max-md:rounded-[inherit]">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 1024px) 440px, (min-width: 768px) 45vw, 80vw"
                    placeholder="blur"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04] max-md:cine-zoom"
                  />
                </div>
                {/* Phones: the photo fills the card and the story sits on a dusk gradient. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-[#06102a] via-[#06102a]/45 to-transparent to-65% md:hidden"
                />
                <div className="flex flex-col gap-[7px] p-[23px] pt-[29px] max-md:p-5 max-md:pt-0">
                  <p className="font-display text-[12.7px] leading-[19px] font-bold text-brand-500 uppercase max-md:tracking-[0.06em] max-md:text-[#c3dc5c]">
                    {item.tag}
                  </p>
                  <h3 className="font-display text-[18.5px] leading-[27.7px] font-bold text-navy-950 max-md:text-[22px] max-md:leading-[1.2] max-md:text-white">
                    {item.title}
                  </h3>
                  <p className="pt-0.5 text-[13.85px] leading-[18.5px] text-slate-600 max-md:text-sm max-md:leading-relaxed max-md:text-white/80">
                    {item.description}
                  </p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
        <RailProgress />
      </div>
    </section>
  );
}
