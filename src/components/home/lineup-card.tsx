"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

import { ActionLink } from "./ui";

export interface LineupCardView {
  label: string;
  image: { src: StaticImageData; alt: string };
  kind: "photo" | "render";
  title: string;
  href: string;
  /** Set when the button leads to the enquiry form: the "Interested in" choice it selects. */
  interest?: string;
}

/** One product card of the lineup: two views (photo ↔ cut-away render, or two product lines). */
export function LineupCard({
  id,
  caption,
  note,
  cta,
  views,
}: {
  id: string;
  caption: string;
  note: string;
  cta: string;
  views: [LineupCardView, LineupCardView];
}) {
  const [active, setActive] = useState(0);
  const view = views[active] ?? views[0];
  const titleId = `${id}-title`;

  return (
    <article id={id} aria-labelledby={titleId} className="flex flex-col items-start gap-5 bg-ish-product p-6">
      <div role="group" aria-label={`${views[0].title}: choose a view`} className="flex flex-wrap gap-x-5 gap-y-2">
        {views.map((item, index) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className="relative pl-[13px] text-[13px] leading-[1.5] text-[#a4b3cd] transition-colors duration-200 before:absolute before:top-1/2 before:left-0 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-ish-lime before:opacity-0 before:transition-opacity hover:text-white aria-pressed:text-white aria-pressed:before:opacity-100"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative aspect-[294/260] w-full overflow-hidden lg:aspect-[576/390]">
        {views.map((item, index) => (
          <Image
            key={item.label}
            src={item.image.src}
            alt={index === active ? item.image.alt : ""}
            aria-hidden={index === active ? undefined : true}
            fill
            sizes="(min-width: 1440px) 576px, (min-width: 768px) 42vw, calc(100vw - 96px)"
            className={cn(
              "object-contain transition-[opacity,scale] duration-700 ease-out-expo",
              item.kind === "render" && "p-[6%] drop-shadow-[0_24px_40px_rgb(0_0_0/0.45)]",
              index === active ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
            )}
          />
        ))}
      </div>

      <p className="text-[12px] leading-[1.5] text-ish-line">{caption}</p>
      <h3 id={titleId} className="type-product-title text-white">
        {view.title}
      </h3>
      <ActionLink href={view.href} tone="white" data-enquire={view.interest} className="w-[180px]">
        {cta}
        <span className="sr-only">: {view.title.toLowerCase()}</span>
      </ActionLink>
      <p className="text-[11px] leading-[1.5] text-ish-line">{note}</p>
    </article>
  );
}
