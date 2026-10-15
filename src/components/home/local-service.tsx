import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { localService } from "@/content/homepage";

import { ActionLink, Label, Statement } from "./ui";

/** "Closer to your power needs": the connected-system card and the four service steps. */
export function LocalService() {
  const { card } = localService;
  return (
    <section id={sectionIds.service} aria-labelledby="service-title" className="anchor-band bg-white">
      <div className="band flex flex-col gap-[25px]">
        <Label id="service-title">{localService.label}</Label>
        <Statement lines={localService.statement} />
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <Reveal y={20} className="flex flex-col gap-[18px] rounded-[32px] bg-ish-pale p-6">
            <div className="relative aspect-[294/220] lg:aspect-[564/330]">
              <Image
                src={card.image.src}
                alt={card.image.alt}
                fill
                sizes="(min-width: 1440px) 564px, (min-width: 1024px) 39vw, calc(100vw - 96px)"
                placeholder="blur"
                className="object-contain"
              />
            </div>
            <p className="type-card-title text-ish-ink">{card.title}</p>
            <p className="text-[14px] leading-[1.5] text-ish-muted">{card.subtitle}</p>
          </Reveal>

          <div className="flex flex-col items-start gap-[30px]">
            <RevealGroup as="ol" stagger={0.08} className="flex flex-col gap-[30px]">
              {localService.steps.map((step) => (
                <RevealItem as="li" key={step.title} className="flex flex-col gap-2">
                  <h3 className="type-step text-ish-ink">{step.title}</h3>
                  <p className="text-[14px] leading-[1.5] text-ish-muted">{step.text}</p>
                </RevealItem>
              ))}
            </RevealGroup>
            <ActionLink href={localService.cta.href} className="w-[215px]">
              {localService.cta.label}
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
