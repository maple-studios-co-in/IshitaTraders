import { ChevronDown } from "lucide-react";

import { getFaqs } from "@/admin/content/content";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { faqSection } from "@/content/home";

const cardClass =
  "group flex items-center justify-between gap-4 rounded-[22px] border border-slate-100 bg-white/90 p-5 shadow-faq transition-[border-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-[rgb(0_82_204/0.3)] hover:shadow-[0_0_0_2.75px_rgb(0_82_204/0.1),0_11px_33px_-5.5px_rgb(16_24_40/0.06)] sm:p-[29px]";

/** FAQs from Admin → FAQs: each question expands to its answer. Questions without an answer aren't shown. */
export async function Faq() {
  const questions = (await getFaqs()).filter((faq) => faq.answer.trim());
  if (questions.length === 0) return null;

  return (
    <section id={sectionIds.faq} aria-labelledby="faq-title" className="bg-white section-y">
      <script
        type="application/ld+json"
        // Escaped for "<" so the JSON can't break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: questions.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="container-site">
        <Reveal className="flex flex-col pb-8 lg:pb-11">
          <p className="text-sm leading-[22px] font-bold tracking-[0.1em] text-brand-450 uppercase sm:text-[16.6px]">
            {faqSection.eyebrow}
          </p>
          <h2
            id="faq-title"
            className="pt-1.5 text-[clamp(3rem,2.2rem+2.4vw,4.375rem)] leading-[1.42] font-black tracking-[-0.035em] text-navy-850"
          >
            {faqSection.title}
          </h2>
          <p className="text-lg leading-[1.5] text-slate-500 sm:text-[22px] sm:leading-[33px]">{faqSection.lead}</p>
        </Reveal>

        <RevealGroup as="ol" stagger={0.08} className="flex flex-col gap-5 pt-5">
          {questions.map((faq, index) => (
            <RevealItem as="li" key={faq.id}>
              <details className={`${cardClass} flex-col items-stretch [&[open]_.faq-chevron]:rotate-180`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-4 sm:gap-[22px]">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-brand-450 sm:size-[55px] sm:text-[22px]"
                    >
                      {index + 1}
                    </span>
                    <span className="max-w-[640px] text-base leading-snug font-bold text-slate-800 sm:text-[22px] sm:leading-[33px]">
                      {faq.question}
                    </span>
                  </span>
                  <ChevronDown
                    className="faq-chevron size-5 shrink-0 text-slate-500 transition-transform duration-300"
                    aria-hidden="true"
                  />
                </summary>
                <p className="max-w-[760px] pt-4 text-[15px] leading-relaxed whitespace-pre-line text-slate-600 sm:pl-[77px] sm:text-[17px]">
                  {faq.answer}
                </p>
              </details>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
