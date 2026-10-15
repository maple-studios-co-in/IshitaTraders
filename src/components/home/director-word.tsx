import Image from "next/image";

import { Reveal } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { directorWord } from "@/content/homepage";

/** "A word from our director": the installation team photo and the quality promise. */
export function DirectorWord({ signature }: { signature: string }) {
  return (
    <section id={sectionIds.director} aria-labelledby="director-title" className="anchor-band bg-white">
      <div className="band grid items-start gap-[50px] lg:grid-cols-2">
        <div className="relative aspect-[342/320] overflow-hidden lg:aspect-[607/460]">
          <Image
            src={directorWord.image.src}
            alt={directorWord.image.alt}
            fill
            sizes="(min-width: 1440px) 607px, (min-width: 1024px) 42vw, calc(100vw - 48px)"
            placeholder="blur"
            className="cine-zoom object-cover"
          />
        </div>
        <Reveal y={20} className="flex flex-col gap-6">
          <h2 id="director-title" className="type-director-label text-ish-muted">
            {directorWord.label}
          </h2>
          <figure className="flex flex-col gap-6">
            <blockquote className="type-director-quote text-ish-ink">
              <p>{directorWord.quote}</p>
            </blockquote>
            <figcaption className="text-[16px] leading-[1.5] text-ish-blue">{signature}</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
