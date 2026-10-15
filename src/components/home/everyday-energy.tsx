import Image from "next/image";

import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { everydayEnergy } from "@/content/homepage";

/** "Everyday energy": the full-bleed rooftop scene with four benefits on navy tiles. */
export function EverydayEnergy() {
  return (
    <section
      aria-labelledby="everyday-title"
      className="relative h-[700px] overflow-hidden bg-ish-deep text-white lg:h-[730px]"
    >
      <Image
        src={everydayEnergy.image.src}
        alt={everydayEnergy.image.alt}
        fill
        sizes="100vw"
        placeholder="blur"
        className="cine-zoom object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-ish-deep/40" />

      <div className="relative band-x h-full pt-[60px]">
        <h2 id="everyday-title" className="max-w-[400px] type-energy-title">
          {everydayEnergy.title}
        </h2>
        <div className="mt-[86px] flex max-w-[480px] flex-col gap-5 lg:absolute lg:top-[140px] lg:right-[var(--band-pad)] lg:mt-0 lg:w-[480px]">
          <h3 className="type-energy-sub">{everydayEnergy.subtitle}</h3>
          <RevealGroup as="ul" stagger={0.08} className="flex flex-col gap-5">
            {everydayEnergy.benefits.map((benefit) => (
              <RevealItem
                as="li"
                key={benefit}
                className="rounded-[16px] bg-ish-navy p-[18px] text-[16px] leading-[1.5] shadow-[0_18px_40px_-28px_rgb(0_0_0/0.8)]"
              >
                {benefit}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
