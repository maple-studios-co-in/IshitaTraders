import type { ReactNode } from "react";

import { contactLinks } from "@/admin/content/links";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { sectionIds } from "@/config/navigation";
import { contactPage } from "@/content/contact-page";
import { cn } from "@/lib/cn";

import { BusinessHours } from "./business-hours";
import { EnquiryCard } from "./enquiry-form";
import { FigmaIcon, type FigmaIconName } from "./figma-icons";

/**
 * "Let’s Build a Brighter Future Together" (Figma 285:169): the ways to reach the shop on the
 * left — every value from Admin → Site content — and the enquiry form on the right.
 */
export function ContactSection({
  contact,
  business,
}: {
  contact: SiteSettings["contact"];
  business: SiteSettings["business"];
}) {
  const links = contactLinks(contact);
  const address = business.address.display;
  const mapHref = business.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section
      id={sectionIds.contact}
      aria-labelledby="contact-title"
      className="bg-linear-to-r from-[#1e3b8b] to-[#2861be] py-14 sm:py-16 lg:pt-[72px] lg:pb-[68px]"
    >
      <div className="container-site grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,687px)] xl:gap-[42px]">
        <div className="flex flex-col">
          <Reveal className="flex flex-col">
            <p className="font-display text-[15px] leading-[1.43] tracking-[0.025em] text-white sm:text-[17.3px]">
              {contactPage.eyebrow}
            </p>
            <h2
              id="contact-title"
              className="mt-5 max-w-[634px] font-display text-[clamp(2.25rem,1.3rem+3.6vw,4rem)] leading-[1.02] font-bold tracking-[-0.025em] text-balance text-white lg:mt-[40px]"
            >
              {contactPage.title.lead}
              <span className="text-[#34b1e2]">{contactPage.title.accent}</span>
              {contactPage.title.tail}
            </h2>
          </Reveal>

          <RevealGroup as="ul" stagger={0.07} className="mt-9 flex flex-col gap-4 sm:gap-5 lg:mt-[59px] xl:gap-[24px]">
            <InfoCard
              icon="phoneWhite"
              disc="bg-[#38bdf8] shadow-[0_4px_6px_-1px_rgb(12_74_110/0.3),0_2px_4px_-2px_rgb(12_74_110/0.3)]"
            >
              <Label>Phone Number</Label>
              <a
                href={links.phone}
                className="font-display text-[17px] leading-7 font-bold tracking-[0.025em] text-white hover:underline hover:underline-offset-4 sm:text-[18px]"
              >
                {contact.phoneDisplay}
              </a>
            </InfoCard>

            <InfoCard
              icon="whatsappWhite"
              iconClassName="size-6"
              disc="bg-[#748f0f] shadow-[0_4px_6px_-1px_rgb(5_46_22/0.4),0_2px_4px_-2px_rgb(5_46_22/0.4)]"
              action={
                <a
                  href={links.whatsapp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#eaf6fc] px-4 py-2 font-display text-[14px] leading-5 font-semibold text-[#748f0f] shadow-[0_1px_1px_rgb(0_0_0/0.05)] transition-colors duration-300 hover:bg-white"
                >
                  <FigmaIcon name="whatsappLime" className="size-4" />
                  {contactPage.whatsapp.cta}
                  <FigmaIcon
                    name="arrowLime"
                    className="h-[3.75px] w-[9.5px] transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5"
                  />
                  <span className="sr-only"> (opens WhatsApp)</span>
                </a>
              }
            >
              <span className="font-display text-[16px] leading-6 font-bold text-white">
                {contactPage.whatsapp.title}
              </span>
              <span className="font-display text-[12px] leading-4 text-white/60">{contactPage.whatsapp.subtitle}</span>
            </InfoCard>

            <InfoCard
              icon="mailWhite"
              disc="bg-[#3b82f6] shadow-[0_4px_6px_-1px_rgb(23_37_84/0.4),0_2px_4px_-2px_rgb(23_37_84/0.4)]"
            >
              <Label>Email Address</Label>
              <a
                href={links.mailto()}
                className="font-display text-[15px] leading-6 font-bold break-all text-white hover:underline hover:underline-offset-4 sm:text-[16px]"
              >
                {contact.email}
              </a>
            </InfoCard>

            <InfoCard
              icon="pinWhite"
              disc="bg-[#f87171] shadow-[0_4px_6px_-1px_rgb(69_10_10/0.4),0_2px_4px_-2px_rgb(69_10_10/0.4)]"
              alignTop
            >
              <Label>Our Office</Label>
              <address className="font-display text-[15px] leading-6 font-semibold text-white/95 not-italic sm:text-[16px]">
                {address}
              </address>
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 px-[15px] py-[5px] font-display text-[12px] leading-4 font-medium text-white transition-colors duration-300 hover:bg-white/10"
              >
                <FigmaIcon name="pinSmall" className="size-3.5" />
                {contactPage.mapsLabel}
                <FigmaIcon
                  name="arrowSmallWhite"
                  className="h-[2.8px] w-[7.1px] transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5"
                />
              </a>
            </InfoCard>

            <InfoCard
              icon="clockWhite"
              disc="bg-[#38bdf8] shadow-[0_4px_6px_-1px_rgb(8_47_73/0.4),0_2px_4px_-2px_rgb(8_47_73/0.4)]"
              alignTop
            >
              <Label>Business Hours</Label>
              <BusinessHours text={business.businessHours} />
            </InfoCard>
          </RevealGroup>
        </div>

        <Reveal delay={0.1} y={32}>
          <EnquiryCard phoneHref={links.phone} whatsappHref={links.whatsapp()} />
        </Reveal>
      </div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="font-display text-[12px] leading-4 font-medium text-white/60">{children}</span>;
}

function InfoCard({
  icon,
  iconClassName = "size-5",
  disc,
  alignTop,
  action,
  children,
}: {
  icon: FigmaIconName;
  iconClassName?: string;
  /** Colour and drop shadow of the icon disc. */
  disc: string;
  alignTop?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RevealItem
      as="li"
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-3 rounded-[16px] border border-white/14 bg-[linear-gradient(143deg,rgb(255_255_255/0.05),rgb(255_255_255/0.02))] px-4 py-[15px] backdrop-blur-[4px] min-[400px]:px-[21px]",
        alignTop ? "items-start" : "items-center",
        action && "justify-between",
      )}
    >
      <span className="flex min-w-0 flex-1 items-start gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center self-center rounded-full",
            disc,
            alignTop && "self-start",
          )}
        >
          <FigmaIcon name={icon} className={iconClassName} />
        </span>
        <span className="flex min-w-0 flex-col self-center">{children}</span>
      </span>
      {action ? <span className="max-sm:basis-full max-sm:pl-16">{action}</span> : null}
    </RevealItem>
  );
}

/** Cleaner Environment · Lower Electricity Bills · Reliable Power Supply (Figma 285:405). */
export function ContactBenefits() {
  return (
    <section aria-label="Why solar with Ishita Traders" className="bg-[#eaf6fc] py-12 sm:py-16 lg:py-[73px]">
      <RevealGroup
        as="ul"
        stagger={0.08}
        className="container-site grid max-w-[970px] grid-cols-3 gap-3 sm:gap-10 lg:gap-[87px]"
      >
        {contactPage.benefits.map((benefit) => (
          <RevealItem
            as="li"
            key={benefit.lines.join(" ")}
            className="flex flex-col items-center gap-3 text-center sm:gap-[14.5px]"
          >
            <span className="grid size-16 place-items-center rounded-full border-[1.45px] border-white/20 bg-[#1e3a8a] shadow-[inset_0_2.9px_5.8px_rgb(0_0_0/0.05)] sm:size-[81px]">
              <FigmaIcon
                name={benefit.icon}
                className={cn(
                  benefit.icon === "leaf" ? "size-8 sm:size-[40.6px]" : "size-6 sm:size-[29px]",
                  benefit.icon === "bolt" && "sm:size-[30.3px]",
                )}
              />
            </span>
            <span className="font-display text-[14px] leading-[1.4] font-semibold text-[#0052cc] sm:text-[20.3px] sm:leading-[29px]">
              {benefit.lines[0]}
              <br />
              {benefit.lines[1]}
            </span>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
