"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import logo from "@/assets/images/brand/logo.png";
import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { CloseIcon, MailOpenIcon, MenuIcon, PhoneIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { contactLinks } from "@/admin/content/links";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { anchor, mainNav, navHref, sectionIds } from "@/config/navigation";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/cn";
import { lockScroll } from "@/lib/smooth-scroll";

// Solar Solutions has no nav link, but its section still ends the Contact highlight, so no link
// lights up while visitors read the solar sections that follow it.
const TRACKED_SECTION_IDS = [...mainNav.map((item) => item.sectionId), sectionIds.solar];
const MENU_ID = "mobile-navigation";

/** Site header. Contact buttons come from Admin → Site content → Contact; nav is page-aware. */
export function SiteHeader({ contact, businessName }: { contact: SiteSettings["contact"]; businessName: string }) {
  const pathname = usePathname();
  const onHomepage = pathname === "/";
  const links = useMemo(() => contactLinks(contact), [contact]);
  const activeSection = useActiveSection(TRACKED_SECTION_IDS);
  const isActive = (item: (typeof mainNav)[number]) =>
    onHomepage ? item.sectionId === activeSection : Boolean(item.href && pathname.startsWith(item.href));
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    lockScroll(true);
    const background = document.querySelectorAll<HTMLElement>("[data-page-content]");
    background.forEach((el) => (el.inert = true));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const desktop = window.matchMedia("(min-width: 80rem)");
    const onBreakpoint = () => desktop.matches && closeMenu();

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      lockScroll(false);
      background.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header
      data-site-header
      className={cn(
        "sticky top-0 z-50 bg-white transition-shadow duration-300",
        (scrolled || menuOpen) && "shadow-[0_1px_0_rgb(15_23_42/0.06),0_10px_30px_-18px_rgb(15_23_42/0.35)]",
      )}
    >
      <div className="container-site flex h-(--header-h) items-center justify-between gap-4 xl:gap-8">
        <a
          href={onHomepage ? anchor(sectionIds.home) : "/"}
          className="shrink-0 rounded-md"
          aria-label={`${businessName} — ${onHomepage ? "back to top" : "home"}`}
        >
          <Image src={logo} alt="" sizes="96px" loading="eager" className="h-12 w-auto xl:h-[70px]" />
        </a>

        <nav aria-label="Primary" className="hidden xl:block">
          {/* Figma 250:7018 spaces the six links 1.8em apart. */}
          <ul className="flex items-center gap-[28.7px] 2xl:gap-[33px]">
            {mainNav.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.sectionId}>
                  <a
                    href={navHref(item, onHomepage)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative py-1.5 text-base font-semibold tracking-[0.01em] text-body transition-colors duration-200 hover:text-navy-800 2xl:text-[18.4px]",
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-leaf-600 after:transition-transform after:duration-300",
                      "hover:after:scale-x-100",
                      active && "font-bold text-leaf-600 after:scale-x-100 hover:text-leaf-600",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ButtonLink
            href={links.whatsapp()}
            variant="outline"
            className="hidden h-[46px] gap-2 rounded-[6px] pr-4 pl-1.5 text-xs font-bold sm:inline-flex"
          >
            <Image src={whatsappLogo} alt="" width={35} height={35} className="size-[35px]" />
            WhatsApp Us
          </ButtonLink>
          <ButtonLink
            href={links.phone}
            variant="accent"
            aria-label={`Call ${contact.phoneDisplay}`}
            className="h-[46px] gap-2.5 rounded-[6px] px-3 text-xs sm:px-3.5"
          >
            <PhoneIcon className="size-6" />
            <span className="hidden sm:inline">{contact.phoneDisplay}</span>
          </ButtonLink>
          <ButtonLink
            href={links.mailto()}
            variant="primary"
            aria-label={`Email ${contact.email}`}
            className="hidden size-[46px] rounded-[6px] bg-navy-700 px-0 sm:inline-flex"
          >
            <MailOpenIcon className="size-[27px]" />
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-[46px] items-center justify-center rounded-[6px] border border-slate-200 text-navy-800 transition-colors hover:bg-surface xl:hidden"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <m.div
            id={MENU_ID}
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-(--header-h) bottom-0 overflow-y-auto overscroll-contain border-t border-slate-100 bg-white xl:hidden"
          >
            <nav aria-label="Mobile" className="container-site flex min-h-full flex-col gap-8 py-8">
              <ul className="flex flex-col">
                {mainNav.map((item) => (
                  <li key={item.sectionId} className="border-b border-slate-100">
                    <a
                      href={navHref(item, onHomepage)}
                      onClick={() => closeMenu()}
                      aria-current={isActive(item) ? "true" : undefined}
                      className={cn(
                        "flex items-center justify-between py-4 font-display text-xl font-semibold text-navy-950",
                        isActive(item) && "text-leaf-600",
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid gap-3 sm:grid-cols-3">
                <ButtonLink href={links.phone} variant="accent" size="lg" className="text-base">
                  <PhoneIcon className="size-5" />
                  Call {contact.phoneDisplay}
                </ButtonLink>
                <ButtonLink href={links.whatsapp()} variant="outline" size="lg" className="text-base">
                  <Image src={whatsappLogo} alt="" width={28} height={28} className="size-7" />
                  WhatsApp Us
                </ButtonLink>
                <ButtonLink href={links.mailto()} variant="primary" size="lg" className="text-base">
                  <MailOpenIcon className="size-6" />
                  Email Us
                </ButtonLink>
              </div>
            </nav>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
