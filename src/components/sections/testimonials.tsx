import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/ui/section-heading";
import { sectionIds } from "@/config/navigation";
import { testimonialsSection } from "@/content/home";

import { TestimonialCarousel } from "./testimonial-carousel";

export function Testimonials() {
  return (
    <section
      id={sectionIds.testimonials}
      aria-labelledby="testimonials-title"
      className="overflow-hidden bg-white section-y"
    >
      <div className="container-site">
        <Reveal className="flex max-w-[640px] flex-col gap-[5px]">
          <Eyebrow className="text-[13.6px]">{testimonialsSection.eyebrow}</Eyebrow>
          <h2
            id="testimonials-title"
            className="font-display text-[clamp(2rem,1.45rem+1.7vw,2.76rem)] leading-[1.07] font-extrabold tracking-[-0.022em] text-navy-900"
          >
            {testimonialsSection.title}
          </h2>
          <p className="text-lg leading-[1.5] text-slate-600 lg:text-[19.5px]">{testimonialsSection.lead}</p>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-8 lg:mt-[50px]">
        <TestimonialCarousel items={testimonialsSection.items} />
      </Reveal>
    </section>
  );
}
