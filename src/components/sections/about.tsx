import Image from "next/image";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonArrow } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { ArrowRightIcon } from "@/components/icons";
import { sectionIds } from "@/config/navigation";
import { aboutSection, type ImageAsset } from "@/content/home";
import { cn } from "@/lib/cn";

export function About() {
  const { gallery } = aboutSection;

  return (
    <section id={sectionIds.about} aria-labelledby="about-title" className="overflow-hidden bg-white section-y">
      <div className="container-site grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,643px)] lg:gap-[clamp(2rem,5vw,6rem)]">
        <div>
          <Reveal>
            <Eyebrow>{aboutSection.eyebrow}</Eyebrow>
            <p
              aria-hidden="true"
              className="mt-10 font-display text-[clamp(3.5rem,2.2rem+4vw,5.4rem)] leading-none font-medium tracking-[-0.01em] text-[#e6e8eb] uppercase select-none lg:mt-[45px]"
            >
              {aboutSection.watermark.map((word) => (
                <span key={word} className="block">
                  {word}
                </span>
              ))}
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-12 flex max-w-[634px] flex-col gap-6 lg:mt-[57px]">
            <p className="font-display text-[15px] font-bold text-leaf-600 uppercase">{aboutSection.established}</p>
            <h2 id="about-title" className="text-lg leading-snug font-medium text-black">
              {aboutSection.title}
            </h2>
            {aboutSection.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-[17px] leading-[1.35] font-light text-black sm:text-lg">
                {paragraph}
              </p>
            ))}
            <SmartLink
              href={aboutSection.learnMore.href}
              className="group/link inline-flex w-fit items-center gap-2 font-display text-[15px] font-bold text-brand-600 uppercase hover:text-navy-800"
            >
              {aboutSection.learnMore.label}
              <ButtonArrow>
                <ArrowRightIcon className="size-3" />
              </ButtonArrow>
            </SmartLink>
          </Reveal>
        </div>

        <RevealGroup
          stagger={0.12}
          className="grid grid-cols-[286fr_333fr] gap-x-[clamp(0.75rem,1.6vw,1.5rem)] lg:pt-4"
        >
          <div className="flex flex-col gap-[clamp(1rem,2.2vw,2rem)]">
            <CollageImage image={gallery.left[0]} ratio="aspect-286/231" />
            <CollageImage image={gallery.left[1]} ratio="aspect-286/410" />
          </div>
          <div className="flex flex-col gap-[clamp(1rem,2.2vw,2rem)]">
            <CollageImage image={gallery.right[0]} ratio="aspect-333/306" />
            <CollageImage image={gallery.right[1]} ratio="aspect-333/336" />
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}

function CollageImage({ image, ratio }: { image: ImageAsset; ratio: string }) {
  return (
    <RevealItem as="figure" className={cn("group relative overflow-hidden rounded-[8px] bg-[#bcbcbc]", ratio)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 1024px) 340px, 48vw"
        placeholder="blur"
        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
      />
    </RevealItem>
  );
}
