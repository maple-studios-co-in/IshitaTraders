import Image from "next/image";

import banner from "@/assets/images/pages/banner.webp";

/**
 * Title banner of the inner pages (Figma "Frame 2147227132": rooftop solar photo under a 76% royal
 * blue wash, centred ExtraBold title). It runs up under the floating navigation, so the pills sit on
 * the photo instead of a white strip.
 */
export function PageBanner({ title, id }: { title: string; id?: string }) {
  return (
    <section
      aria-labelledby={id}
      className="relative isolate -mt-(--header-h) flex h-[calc(var(--header-h)+clamp(190px,23.3vw,366px))] items-end overflow-hidden bg-[#94a3b8]"
    >
      <Image
        src={banner}
        alt=""
        fill
        priority
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-[50%_40%]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgb(31_60_140/0.76)]" />
      <div className="flex h-[clamp(190px,23.3vw,366px)] w-full items-center justify-center px-5">
        <h1
          id={id}
          className="text-center font-display text-[clamp(2rem,1.45rem+2.2vw,3rem)] leading-none font-extrabold tracking-[-0.022em] text-white"
        >
          {title}
        </h1>
      </div>
    </section>
  );
}
