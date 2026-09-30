import { ArrowRightIcon, WhatsAppIcon } from "@/components/icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { faqSection } from "@/content/home";
import { whatsappHref } from "@/lib/contact-links";

export function Faq() {
  return (
    <section id={sectionIds.faq} aria-labelledby="faq-title" className="bg-white section-y">
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
          {faqSection.questions.map((question, index) => (
            <RevealItem as="li" key={question}>
              <a
                href={whatsappHref(`Hi Ishita Traders, ${question}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 rounded-[22px] border border-slate-100 bg-white/90 p-5 shadow-faq transition-[border-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-[rgb(0_82_204/0.3)] hover:shadow-[0_0_0_2.75px_rgb(0_82_204/0.1),0_11px_33px_-5.5px_rgb(16_24_40/0.06)] sm:p-[29px]"
              >
                <span className="flex items-center gap-4 sm:gap-[22px]">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-brand-450 sm:size-[55px] sm:text-[22px]"
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-[640px] text-base leading-snug font-bold text-slate-800 sm:text-[22px] sm:leading-[33px]">
                    {question}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 border-l border-slate-100 pl-3 sm:pl-[18px]">
                  <span className="flex size-11 items-center justify-center rounded-full bg-whatsapp text-white shadow-card">
                    <WhatsAppIcon className="size-4" />
                  </span>
                  <ArrowRightIcon className="ml-2 hidden size-2.5 text-slate-700 transition-transform duration-300 ease-out-expo group-hover:translate-x-1 sm:block" />
                  <span className="sr-only">Ask on WhatsApp</span>
                </span>
              </a>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
