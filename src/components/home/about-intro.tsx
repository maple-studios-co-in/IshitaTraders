import type { ComponentType, SVGProps } from "react";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { aboutIntro, type FactIcon } from "@/content/homepage";

import { BagLineIcon, BoltLineIcon, PinLineIcon, ShieldLineIcon } from "./icons";
import { Label, Lines } from "./ui";

const factIcons: Record<FactIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  pin: PinLineIcon,
  bolt: BoltLineIcon,
  shield: ShieldLineIcon,
  bag: BagLineIcon,
};

/** "What is ISHITA": the manifesto and four business facts (town and founding year from the admin). */
export function AboutIntro({ facts }: { facts: Record<string, string> }) {
  const fill = (line: string) => line.replace(/\{(\w+)\}/g, (match, key: string) => facts[key] ?? match);
  return (
    <section id={sectionIds.about} aria-labelledby="about-title" className="anchor-band bg-white">
      <div className="band flex flex-col gap-[25px]">
        <Label id="about-title">{aboutIntro.label}</Label>
        <Reveal y={20}>
          <p className="type-manifesto text-pretty text-ish-ink">{aboutIntro.manifesto}</p>
        </Reveal>
        <RevealGroup as="ul" stagger={0.07} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {aboutIntro.facts.map((fact) => {
            const Icon = factIcons[fact.icon];
            return (
              <RevealItem
                as="li"
                key={fact.icon}
                className="flex flex-col gap-[35px] rounded-[32px] bg-ish-fact p-6 lg:gap-[60px]"
              >
                <span className="grid size-[42px] place-items-center rounded-full bg-white text-ish-lime">
                  <Icon className="size-5" />
                </span>
                <p className="type-fact text-ish-ink">
                  <Lines lines={fact.lines.map(fill)} />
                </p>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
