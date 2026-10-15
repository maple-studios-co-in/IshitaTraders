import Image from "next/image";

import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { anchor, sectionIds } from "@/config/navigation";
import { applications } from "@/content/homepage";

import { UpRightIcon } from "./icons";
import { Label, Statement } from "./ui";

/** "Power for every space": residential, commercial and institutional work; each asks about it below. */
export function Applications() {
  return (
    <section id={sectionIds.applications} aria-labelledby="applications-title" className="anchor-band bg-white">
      <div className="band flex flex-col gap-[25px]">
        <Label id="applications-title">{applications.label}</Label>
        <Statement lines={[applications.statement]} />
        <RevealGroup as="ul" stagger={0.1} className="grid gap-6 md:grid-cols-3">
          {applications.items.map((item) => (
            <RevealItem as="li" key={item.id}>
              <a
                id={item.id}
                href={anchor(sectionIds.contact)}
                data-enquire={item.interest}
                className="group flex flex-col gap-[18px]"
              >
                <span className="relative block aspect-[342/260] overflow-hidden md:aspect-[405/300]">
                  <Image
                    src={item.image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1440px) 405px, (min-width: 768px) 30vw, calc(100vw - 48px)"
                    placeholder="blur"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                </span>
                <span className="flex items-center justify-between gap-3 type-app-label text-ish-ink">
                  {item.title}
                  <UpRightIcon className="size-[0.85em] shrink-0 text-ish-blue opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
                </span>
                <span className="sr-only">: ask us about {item.interest.toLowerCase()}</span>
              </a>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
