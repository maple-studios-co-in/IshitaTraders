import Image from "next/image";

import type { ResolvedImage } from "@/admin/content/images";

/**
 * Full-bleed catalogue banner (Figma 224:7328). The design crops the 1757px-wide artwork to the
 * 1573px frame, i.e. a 1573:659 window centred on the brand line-up; phones get a slightly taller
 * crop so the logos stay readable. The page's only <h1> lives here for screen readers and search.
 */
export function CatalogueBanner({ image, title }: { image: ResolvedImage | null; title: string }) {
  return (
    <section aria-labelledby="catalogue-title" className="relative bg-[#dce8f7]">
      <h1 id="catalogue-title" className="sr-only">
        {title}
      </h1>
      <div className="relative aspect-[2/1] max-h-[720px] w-full overflow-hidden sm:aspect-[1573/659]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            preload
            quality={85}
            sizes="100vw"
            placeholder={image.placeholder}
            blurDataURL={image.blurDataURL}
            className="object-cover"
          />
        ) : null}
      </div>
    </section>
  );
}
