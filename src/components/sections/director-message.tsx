import Image from "next/image";

import { Reveal } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { directorSection } from "@/content/home";

export function DirectorMessage() {
  return (
    <section id={sectionIds.director} aria-labelledby="director-title" className="bg-section-fade section-y">
      <div className="container-site grid items-start gap-12 lg:grid-cols-[minmax(0,472px)_minmax(0,1fr)] lg:gap-[clamp(3rem,5vw,4.5rem)]">
        <Reveal as="figure" className="flex flex-col">
          <div className="relative aspect-square w-full max-w-[472px] overflow-hidden rounded-[15px] border border-slate-200 bg-slate-100 shadow-panel">
            <Image
              src={directorSection.portrait.src}
              alt={directorSection.portrait.alt}
              fill
              sizes="(min-width: 1024px) 472px, 92vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <figcaption className="pt-5">
            <p className="font-display text-[22px] leading-[34px] font-extrabold text-navy-950">
              {siteConfig.director.name}
            </p>
            <p className="font-display text-[14.8px] leading-5 font-semibold text-brand-500">
              {siteConfig.director.title}
            </p>
            <p className="text-[14.8px] leading-5 text-slate-500">{directorSection.location}</p>
          </figcaption>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 pt-1.5">
            <p className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-leaf-700 uppercase">
              {directorSection.eyebrow}
            </p>
            <h2
              id="director-title"
              className="font-display text-[clamp(1.75rem,1.3rem+1.4vw,2.3rem)] leading-[1.2] font-extrabold text-balance-safe text-navy-950"
            >
              {directorSection.quote}
            </h2>
          </div>

          <div className="flex flex-col gap-[13px]">
            {directorSection.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-base leading-7 text-slate-600 lg:text-[17.2px]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-[5px] rounded-[10px] border-l-[5px] border-leaf-700 bg-surface py-5 pr-5 pl-6">
            <p className="text-base leading-[24.6px] font-bold text-navy-950 lg:text-[17.2px]">
              {directorSection.principle.title}
            </p>
            <ul className="flex flex-col">
              {directorSection.principle.points.map((point) => (
                <li key={point} className="text-base leading-[24.6px] font-medium text-slate-700 lg:text-[17.2px]">
                  <span aria-hidden="true">• </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="pt-3 font-display text-base leading-[24.6px] font-bold text-navy-950 lg:text-[17.2px]">
            {directorSection.signature}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
