import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { SolarLineArt } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import { contactSection } from "@/content/home";

import { ContactForm } from "./contact-form";

export async function Contact() {
  const { title } = contactSection;
  const { contact, business } = await getSiteSettings();
  const links = contactLinks(contact);

  return (
    <section
      id={sectionIds.contact}
      aria-labelledby="contact-title"
      className="relative overflow-hidden bg-[linear-gradient(89deg,#1e3a8a_0.5%,#2862be_99.5%)] py-16 lg:pt-20 lg:pb-[60px]"
    >
      <div className="container-site grid gap-12 lg:grid-cols-2 lg:gap-[clamp(3rem,5.5vw,5rem)]">
        <Reveal className="relative flex flex-col">
          <p className="font-display text-[17.3px] leading-[24.75px] tracking-[0.025em] text-leaf-500">
            {contactSection.tag}
          </p>
          <h2
            id="contact-title"
            className="mt-6 max-w-[634px] font-display text-[clamp(2.5rem,1.4rem+3.2vw,4rem)] leading-none font-bold tracking-[-0.025em] text-white lg:mt-10"
          >
            {title.lead} <span className="text-leaf-600">{title.highlight[0]}</span>{" "}
            <span className="text-leaf-600">{title.highlight[1]}</span> {title.trail}
          </h2>

          <div className="relative mt-12 flex flex-1 flex-col gap-16 pt-2.5 lg:mt-[69px] lg:gap-20">
            <SolarLineArt className="pointer-events-none absolute -right-5 -bottom-5 hidden w-[min(507px,80%)] text-[#f2f8fe] opacity-50 sm:block" />

            <address className="relative flex max-w-[475px] flex-col gap-3.5 not-italic">
              <p className="font-display text-[17.3px] leading-[24.75px] font-semibold tracking-[0.025em] text-neutral-300">
                {contactSection.infoTitle}
              </p>
              <p className="max-w-[330px] text-[17px] leading-[19.7px] text-[#b4becb]">{business.address.display}</p>
              <p className="flex flex-col pt-1 font-display text-[17.3px] leading-7 text-[#ded7d7]">
                <span>
                  Phone no:{" "}
                  <a href={links.phone} className="transition-colors hover:text-white">
                    {contact.phoneDisplay}
                  </a>
                </span>
                <span>
                  Email ID:{" "}
                  <a href={links.mailto()} className="break-all transition-colors hover:text-white">
                    {contact.email}
                  </a>
                </span>
              </p>
            </address>

            <nav aria-label="Quick links" className="relative flex flex-col gap-[15px]">
              <p className="font-display text-[14.85px] leading-5 font-semibold tracking-[0.05em] text-neutral-300 uppercase">
                {contactSection.quickLinksTitle}
              </p>
              <ul className="flex flex-wrap items-center gap-x-[25px] gap-y-2">
                {contactSection.quickLinks.map((link) => (
                  <li key={link.label}>
                    <SmartLink
                      href={link.href}
                      className="font-display text-[14.85px] leading-5 text-neutral-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Reveal>

        <Reveal
          delay={0.12}
          className="rounded-[16.5px] bg-[#f2f8fe] p-6 shadow-float sm:p-10 lg:self-start lg:p-[54px]"
        >
          <ContactForm phoneHref={links.phone} whatsappHref={links.whatsapp()} />
        </Reveal>
      </div>
    </section>
  );
}
