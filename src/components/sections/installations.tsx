import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
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

        <RevealGroup as="ul" className="mt-10 grid gap-8 md:grid-cols-2 lg:mt-[55px] lg:grid-cols-3 lg:gap-[37px]">
          {installationsSection.items.map((item) => (
            <RevealItem as="li" key={item.title} className="flex">
              <article className="group flex w-full flex-col overflow-hidden rounded-[9.2px] border border-slate-200 bg-white p-px shadow-soft transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-[0_24px_44px_-28px_rgb(15_39_74/0.45)]">
                <div className="relative h-[277px] overflow-hidden rounded-t-[8.2px] bg-slate-100">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 1024px) 440px, (min-width: 768px) 45vw, 92vw"
                    placeholder="blur"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-col gap-[7px] p-[23px] pt-[29px]">
                  <p className="font-display text-[12.7px] leading-[19px] font-bold text-brand-500 uppercase">
                    {item.tag}
                  </p>
                  <h3 className="font-display text-[18.5px] leading-[27.7px] font-bold text-navy-950">{item.title}</h3>
                  <p className="pt-0.5 text-[13.85px] leading-[18.5px] text-slate-600">{item.description}</p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
