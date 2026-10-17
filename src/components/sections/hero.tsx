import Image from "next/image";
import { preload } from "react-dom";

import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { HeroFilm } from "@/components/hero/hero-film";
import { HeadsetIcon, MailIcon, PhoneOutlineIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { frameUrl, heroFilm } from "@/content/hero";

/**
 * Homepage hero — the scroll film (see src/components/hero). Captions and brands are editable in
 * Admin → Site content → Hero. The opening frames are preloaded for the first paint.
 */
export async function Hero() {
  const { hero } = await getSiteSettings();
  preload(frameUrl(heroFilm.wide, 0), { as: "image", fetchPriority: "high", media: WIDE_MEDIA });
  preload(frameUrl(heroFilm.tall, 0), { as: "image", fetchPriority: "high", media: TALL_MEDIA });
  return <HeroFilm scenes={hero.scenes} brands={hero.trustedBrands} />;
}

const TALL_MEDIA = `(max-aspect-ratio: ${Math.round(heroFilm.tallBelowAspect * 100)}/100)`;
const WIDE_MEDIA = `not all and ${TALL_MEDIA}`;

/** Quick contact strip — the first thing that slides up over the film when it ends. */
export async function HeroContactStrip() {
  const { hero, contact } = await getSiteSettings();
  return <QuickContactStrip hero={hero} contact={contact} />;
}

function QuickContactStrip({ hero, contact }: { hero: SiteSettings["hero"]; contact: SiteSettings["contact"] }) {
  const links = contactLinks(contact);
  return (
    <div className="border-b border-slate-200 bg-slate-50 py-3.5 max-md:hidden">
      <div className="container-site flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display">
          <HeadsetIcon className="h-[15px] w-[16.7px] shrink-0 text-navy-800" />
          <span className="text-sm leading-5 font-semibold text-slate-700">{hero.helpQuestion}</span>
          <span className="text-xs leading-4 font-medium text-slate-500">{hero.helpLabel}</span>
          <a href={links.phone} className="pl-1 text-sm leading-5 font-bold text-navy-950 hover:text-brand-600">
            {contact.phoneDisplay}
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href={links.phone} variant="accent" size="sm" className="font-bold">
            <PhoneOutlineIcon className="size-3" />
            Call Now
          </ButtonLink>
          <ButtonLink href={links.whatsapp()} variant="outline" size="sm" className="font-bold">
            <Image src={whatsappLogo} alt="" width={18} height={18} className="size-[18px]" />
            WhatsApp Us
          </ButtonLink>
          <ButtonLink href={links.mailto()} variant="light" size="sm">
            <MailIcon className="h-[10.7px] w-[13.3px]" />
            Email Us
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
