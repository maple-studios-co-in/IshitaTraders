import Image from "next/image";
import { Fragment } from "react";

import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { HeadsetIcon, MailIcon, PhoneOutlineIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { sectionIds } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { hero } from "@/content/home";
import { mailtoHref, phoneHref, whatsappHref } from "@/lib/contact-links";

const riseDelay = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

export function Hero() {
  return (
    <section id={sectionIds.home} aria-labelledby="hero-title" className="relative isolate flex flex-col bg-navy-950">
      <div className="relative flex min-h-[560px] items-center overflow-hidden py-20 lg:h-[min(755px,calc(100svh-var(--header-h)-60px))] lg:min-h-[600px] lg:py-0">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          preload
          quality={85}
          sizes="100vw"
          placeholder="blur"
          className="-z-20 animate-hero-zoom object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-900/50" />

        <div className="container-site">
          <div className="flex max-w-[932px] flex-col items-start gap-6 lg:-mt-16 lg:gap-[29px]">
            <p
              className="animate-rise rounded-[5px] border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-bold tracking-[0.1em] text-slate-100 uppercase backdrop-blur-[5px] sm:text-[14.5px]"
              style={riseDelay(0)}
            >
              <span className="font-display">{hero.eyebrow}</span>
              <span aria-hidden="true" className="mx-2">
                •
              </span>
              <span className="font-display">{hero.established}</span>
            </p>

            <h1
              id="hero-title"
              className="animate-rise font-display text-[clamp(2.5rem,1.55rem+2.6vw,3.25rem)] leading-[1.22] font-extrabold tracking-[-0.025em] text-white"
              style={riseDelay(1)}
            >
              {hero.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p
              className="max-w-[816px] animate-rise text-[17px] leading-[1.6] text-slate-200 sm:text-xl lg:text-[21.85px] lg:leading-[34px]"
              style={riseDelay(2)}
            >
              {hero.description}
            </p>

            <div
              className="flex w-full animate-rise flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-white/15 pt-2 font-display text-lg tracking-[0.025em] sm:text-[22px] lg:text-[26.7px] lg:leading-[38px]"
              style={riseDelay(3)}
            >
              <p className="font-semibold text-leaf-600">{hero.trustedBrandsLabel}</p>
              <ul className="flex flex-wrap items-center gap-x-3.5" aria-label="Trusted brands">
                {hero.trustedBrands.map((brand, index) => (
                  <Fragment key={brand}>
                    {index > 0 ? (
                      <li aria-hidden="true" className="font-semibold text-slate-500">
                        •
                      </li>
                    ) : null}
                    <li className="font-bold text-white">{brand}</li>
                  </Fragment>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <QuickContactStrip />
    </section>
  );
}

function QuickContactStrip() {
  return (
    <div className="border-b border-slate-200 bg-slate-50 py-3.5">
      <div className="container-site flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display">
          <HeadsetIcon className="h-[15px] w-[16.7px] shrink-0 text-navy-800" />
          <span className="text-sm leading-5 font-semibold text-slate-700">{hero.helpLine.question}</span>
          <span className="text-xs leading-4 font-medium text-slate-500">{hero.helpLine.label}</span>
          <a href={phoneHref} className="pl-1 text-sm leading-5 font-bold text-navy-950 hover:text-brand-600">
            {siteConfig.phone.display}
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href={phoneHref} variant="accent" size="sm" className="font-bold">
            <PhoneOutlineIcon className="size-3" />
            Call Now
          </ButtonLink>
          <ButtonLink href={whatsappHref()} variant="outline" size="sm" className="font-bold">
            <Image src={whatsappLogo} alt="" width={18} height={18} className="size-[18px]" />
            WhatsApp Us
          </ButtonLink>
          <ButtonLink href={mailtoHref()} variant="light" size="sm">
            <MailIcon className="h-[10.7px] w-[13.3px]" />
            Email Us
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
