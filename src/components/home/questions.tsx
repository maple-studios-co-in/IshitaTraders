import { getFaqs } from "@/admin/content/content";
import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { sectionIds } from "@/config/navigation";
import { questions } from "@/content/homepage";

import { ArrowIcon, PlusIcon } from "./icons";
import { Label } from "./ui";

/**
 * "Questions, answered." from Admin → FAQs. Answered questions open in place; a question still
 * waiting for its answer asks it on WhatsApp instead. `structuredData` marks the answers up for
 * search engines — on one page only.
 */
export async function Questions({ structuredData = false }: { structuredData?: boolean }) {
  const [faqs, settings] = await Promise.all([getFaqs(), getSiteSettings()]);
  if (faqs.length === 0) return null;
  const links = contactLinks(settings.contact);
  const answered = faqs.filter((faq) => faq.answer);

  return (
    <section id={sectionIds.faq} aria-labelledby="faq-title" className="anchor-band bg-white">
      {structuredData && answered.length > 0 ? (
        <script
          type="application/ld+json"
          // Escaped for "<" so the JSON can't break out of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: answered.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            }).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <div className="band flex flex-col gap-[25px]">
        <Label id="faq-title">{questions.label}</Label>
        <ul className="flex flex-col gap-[25px]">
          {faqs.map((faq) => (
            <li key={faq.id} className="border-b border-ish-line pb-[14px]">
              {faq.answer ? (
                <details className="faq-item group">
                  <summary className="block cursor-pointer list-none type-question text-ish-ink transition-colors hover:text-ish-blue [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    {"\u00a0"}
                    <PlusIcon className="ml-2 inline-block size-[0.8em] align-[-0.08em] transition-transform duration-300 ease-out-expo group-open:rotate-45" />
                  </summary>
                  <p className="max-w-[760px] pt-3 pb-1 text-[15px] leading-[1.65] whitespace-pre-line text-ish-muted md:text-[16px]">
                    {faq.answer}
                  </p>
                </details>
              ) : (
                <a
                  href={links.whatsapp(`Hi Ishita Traders, ${faq.question}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block type-question text-ish-ink transition-colors hover:text-ish-blue"
                >
                  {faq.question}
                  {"\u00a0"}
                  <ArrowIcon className="ml-2 inline-block size-[0.8em] align-[-0.08em] transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
                  <span className="sr-only">— ask us on WhatsApp (opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
