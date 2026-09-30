import Image from "next/image";

import logo from "@/assets/images/brand/logo.png";
import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  LongArrowIcon,
  MailIcon,
  MapPinIcon,
  PhoneOutlineIcon,
  XIcon,
} from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { anchor, mainNav } from "@/config/navigation";
import { siteConfig, type SocialPlatform } from "@/config/site";
import { finalCta, footerContent } from "@/content/home";
import { mailtoHref, phoneHref } from "@/lib/contact-links";

const socialIcons: Record<SocialPlatform, { Icon: typeof FacebookIcon; className: string }> = {
  facebook: { Icon: FacebookIcon, className: "h-[36.7px] w-[21.5px]" },
  linkedin: { Icon: LinkedInIcon, className: "size-[31.5px]" },
  x: { Icon: XIcon, className: "h-[29.8px] w-[32.9px]" },
  instagram: { Icon: InstagramIcon, className: "size-[31.5px]" },
};

export function FinalCta() {
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
          <ButtonLink
            href={finalCta.quote.href}
            variant="white"
            size="lg"
            className="font-display text-[17.2px] font-semibold"
          >
            {finalCta.quote.label}
            <ButtonArrow>
              <LongArrowIcon className="h-1 w-2.5" />
            </ButtonArrow>
          </ButtonLink>
          <ButtonLink
            href={finalCta.whatsapp.href}
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

export function SiteFooter() {
  const socials = siteConfig.socials.filter((social) => social.href);

  return (
    <footer data-page-content className="border-t border-slate-800 bg-black" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        {siteConfig.name} — footer
      </h2>
      <div className="container-site py-14 lg:py-[69px]">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="flex flex-col gap-[15px]">
            <Image src={logo} alt={siteConfig.name} sizes="140px" className="h-[118px] w-auto self-start" />
            <p className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-brand-700 uppercase">
              {footerContent.tagline}
            </p>
            <p className="max-w-[320px] text-[14.8px] leading-6 text-slate-400">{footerContent.description}</p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2.5">
            <h3 className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-white uppercase">
              Quick links
            </h3>
            <ul className="flex flex-col gap-[7.4px]">
              {mainNav.map((item) => (
                <li key={item.sectionId}>
                  <a
                    href={anchor(item.sectionId)}
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

          <div className="flex flex-col gap-[21px]">
            <h3 className="font-display text-[14.8px] leading-5 font-bold tracking-[0.05em] text-white uppercase">
              Contact
            </h3>
            <address className="flex flex-col gap-2.5 text-[14.8px] leading-5 text-slate-400 not-italic">
              <p className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-[15.8px] w-[13.1px] shrink-0 text-brand-700" />
                <span className="max-w-[260px]">{siteConfig.address.display}</span>
              </p>
              <a href={phoneHref} className="flex items-center gap-2.5 transition-colors hover:text-white">
                <PhoneOutlineIcon className="size-[14.8px] shrink-0 text-green-600" />
                {siteConfig.phone.display}
              </a>
              <a href={mailtoHref()} className="flex items-center gap-2.5 break-all transition-colors hover:text-white">
                <MailIcon className="h-[13.1px] w-[16.4px] shrink-0 text-brand-700" />
                {siteConfig.email}
              </a>
            </address>
            {socials.length > 0 ? (
              <ul className="flex items-center gap-8" aria-label="Social media">
                {socials.map(({ platform, href, label }) => {
                  const { Icon, className } = socialIcons[platform];
                  return (
                    <li key={platform}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex text-white transition-opacity hover:opacity-75"
                      >
                        <Icon className={className} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-[31px] text-center text-[14.8px] leading-5 text-slate-400 lg:mt-4">
          <p>{footerContent.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
