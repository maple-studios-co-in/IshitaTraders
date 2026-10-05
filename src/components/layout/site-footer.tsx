import Image, { type StaticImageData } from "next/image";

import logo from "@/assets/images/brand/logo.png";
import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import facebookLogo from "@/assets/images/social/facebook.svg";
import instagramLogo from "@/assets/images/social/instagram.svg";
import linkedinLogo from "@/assets/images/social/linkedin.svg";
import xLogo from "@/assets/images/social/x.png";
import { contactLinks, resolveLink } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { LongArrowIcon, MailIcon, MapPinIcon, PhoneOutlineIcon } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { mainNav, navHref } from "@/config/navigation";
import { siteConfig, type SocialPlatform } from "@/config/site";
import { finalCta } from "@/content/home";
import { cn } from "@/lib/cn";

/**
 * Brand icons from the Figma footer (320:179): 54px each, 38px apart, Instagram drawn a touch larger.
 * Facebook and X sit on rounded tiles like the design. Sizes use the contact column's width (cqw), so
 * the row keeps its design size wherever it fits and shrinks in proportion where it doesn't.
 */
const socialIcons: Record<SocialPlatform, { src: StaticImageData; size: string; tile?: string; image: string }> = {
  facebook: {
    src: facebookLogo,
    size: "size-[min(54.051px,16.3cqw)]",
    tile: "overflow-hidden rounded-[16%] bg-[#0866ff]",
    image: "top-0 -left-[1.85%] size-full",
  },
  linkedin: { src: linkedinLogo, size: "size-[min(54.051px,16.3cqw)]", image: "inset-0 size-full" },
  x: {
    src: xLogo,
    size: "size-[min(54.051px,16.3cqw)]",
    tile: "overflow-hidden rounded-[16%] bg-white",
    image: "top-[5.33%] left-[6.66%] size-[90.67%]",
  },
  instagram: { src: instagramLogo, size: "size-[min(55.492px,16.73cqw)]", image: "inset-0 size-full" },
};

/** Closing call to action. Pass `onHomepage={false}` on other pages so "Get a Quote" leads back to the homepage form. */
export async function FinalCta({ onHomepage = true }: { onHomepage?: boolean }) {
  const links = contactLinks((await getSiteSettings()).contact);
  const quoteHref =
    !onHomepage && finalCta.quote.href.startsWith("#") ? `/${finalCta.quote.href}` : finalCta.quote.href;
  return (
    <section aria-labelledby="final-cta-title" className="bg-linear-to-r from-navy-800 to-[#2861be] py-16 lg:py-[79px]">
      <Reveal className="container-site flex max-w-[1102px] flex-col items-center gap-[29.5px] text-center">
        <h2
          id="final-cta-title"
          className="font-display text-[clamp(2rem,1.4rem+1.9vw,2.77rem)] leading-[1.1] font-extrabold tracking-[-0.025em] text-white"
        >
          {finalCta.title}
        </h2>
        <p className="max-w-[660px] text-[17px] leading-[1.35] text-white">{finalCta.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-5 pt-2.5">
          <ButtonLink href={quoteHref} variant="white" size="lg" className="font-display text-[17.2px] font-semibold">
            {finalCta.quote.label}
            <ButtonArrow>
              <LongArrowIcon className="h-1 w-2.5" />
            </ButtonArrow>
          </ButtonLink>
          <ButtonLink
            href={resolveLink(finalCta.whatsapp.href, links)}
            variant="whatsapp"
            size="lg"
            className="font-display text-[17.2px] font-semibold"
          >
            <Image src={whatsappLogo} alt="" width={35} height={35} className="size-[35px]" />
            {finalCta.whatsapp.label}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}

/** Site footer. Pass `onHomepage={false}` on other pages so section links point back to the homepage. */
export async function SiteFooter({ onHomepage = true }: { onHomepage?: boolean }) {
  const { business, contact, social } = await getSiteSettings();
  const links = contactLinks(contact);
  const socials = siteConfig.socials.map((item) => ({ ...item, href: social[item.platform] }));
  const hasSocialLinks = socials.some((item) => item.href);

  return (
    <footer data-page-content className="border-t border-slate-800 bg-black" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        {business.name} — footer
      </h2>
      <div className="container-site py-14 lg:py-[69px]">
        {/* Columns start at 23.6% / 47.2% / 70.8% like the Figma footer; the wider last column holds the social row. */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.41fr] lg:gap-10">
          <div className="flex flex-col gap-[15px]">
            <Image src={logo} alt={business.name} sizes="140px" className="h-[118px] w-auto self-start" />
            <p className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-brand-700 uppercase">
              {business.tagline}
            </p>
            <p className="max-w-[320px] text-[14.8px] leading-6 text-slate-400">{business.footerBlurb}</p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2.5">
            <h3 className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-white uppercase">
              Quick links
            </h3>
            <ul className="flex flex-col gap-[7.4px]">
              {mainNav.map((item) => (
                <li key={item.sectionId}>
                  <a
                    href={navHref(item, onHomepage)}
                    className="text-[14.8px] leading-5 text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-2.5">
            <h3 className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-white uppercase">
              Brands
            </h3>
            <ul className="flex flex-col gap-[6.8px]">
              {siteConfig.brands.map((brand) => (
                <li
                  key={brand}
                  className="flex items-center gap-[7.4px] text-[14.8px] leading-5 font-semibold text-slate-300"
                >
                  <span aria-hidden="true" className="size-[7.4px] rounded-full bg-green-600" />
                  {brand}
                </li>
              ))}
            </ul>
          </div>

          <div className="@container flex flex-col gap-[21px]">
            <h3 className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-white uppercase">
              Contact
            </h3>
            <address className="flex flex-col gap-2.5 text-[14.8px] leading-5 text-slate-400 not-italic">
              <p className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-[15.8px] w-[13.1px] shrink-0 text-brand-700" />
                <span className="max-w-[260px]">{business.address.display}</span>
              </p>
              <a href={links.phone} className="flex items-center gap-2.5 transition-colors hover:text-white">
                <PhoneOutlineIcon className="size-[14.8px] shrink-0 text-green-600" />
                {contact.phoneDisplay}
              </a>
              <a
                href={links.mailto()}
                className="flex items-center gap-2.5 break-all transition-colors hover:text-white"
              >
                <MailIcon className="h-[13.1px] w-[16.4px] shrink-0 text-brand-700" />
                {contact.email}
              </a>
            </address>
            {/* 39px below the email line, as in the design (21px column gap + 18px). */}
            <ul
              aria-label={hasSocialLinks ? "Social media" : undefined}
              aria-hidden={hasSocialLinks ? undefined : true}
              className="mt-[18px] flex items-start gap-[min(38px,11.46cqw)]"
            >
              {socials.map(({ platform, href, label }) => {
                const icon = socialIcons[platform];
                const art = (
                  <span className={cn("relative block", icon.size, icon.tile)}>
                    <Image src={icon.src} alt="" sizes="56px" className={cn("absolute max-w-none", icon.image)} />
                  </span>
                );
                return (
                  <li key={platform} aria-hidden={href ? undefined : true}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="block rounded-[16%] transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        {art}
                      </a>
                    ) : (
                      art
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-[31px] text-center text-[14.8px] leading-5 text-slate-400 lg:mt-4">
          <p>{business.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
