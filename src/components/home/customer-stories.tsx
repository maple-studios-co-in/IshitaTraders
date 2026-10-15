import { getTestimonials } from "@/admin/content/content";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { customerStories } from "@/content/homepage";

import { Label, Statement } from "./ui";

/** "Our customers": up to three real reviews from Admin → Testimonials (sample placeholders stay out). */
export async function CustomerStories() {
  const stories = (await getTestimonials()).filter((item) => !item.isSample).slice(0, 3);
  if (stories.length === 0) return null;

  return (
    <section id={sectionIds.customers} aria-labelledby="customers-title" className="anchor-band bg-white">
      <div className="band flex flex-col gap-[25px]">
        <Label id="customers-title">{customerStories.label}</Label>
        <Statement lines={customerStories.statement} />
        <RevealGroup as="ul" stagger={0.1} className="grid gap-[30px] lg:grid-cols-3">
          {stories.map((story) => (
            <RevealItem as="li" key={story.id}>
              <figure className="flex flex-col gap-[25px]">
                <span
                  aria-hidden="true"
                  className="h-[72px] text-[64px] leading-[1.12] tracking-[-0.025em] text-ish-blue"
                >
                  “
                </span>
                <blockquote className="type-quote text-ish-ink">
                  <p>{story.quote}</p>
                </blockquote>
                <figcaption className="text-[13px] leading-[1.5] text-ish-muted">
                  {story.name}
                  {story.location ? ` ${story.location.replace(/\s*[•|]\s*/g, " · ")}` : null}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
        <p className="text-[12px] leading-[1.5] text-ish-muted">{customerStories.note}</p>
      </div>
    </section>
  );
}
