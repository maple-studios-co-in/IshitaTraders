"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import logo from "@/assets/images/brand/logo.png";
import logoMark from "@/assets/images/brand/logo-mark.png";
import whatsappLogo from "@/assets/images/icons/whatsapp.png";
import { ArrowRightIcon, CloseIcon, MailOpenIcon, MenuIcon, PhoneIcon } from "@/components/icons";
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

/** Item counts shown as badges on the floating hero navigation. */
export interface NavCounts {
  products: number;
  brands: number;
}

/**
 * Site header. Contact buttons come from Admin → Site content → Contact; nav is page-aware.
 * With `overHero` (homepage) it floats over the hero film as frosted pills, and turns into the
 * white bar once the page slides up over the film (`[data-hero-cover]`).
 */
export function SiteHeader({
  contact,
  businessName,
  overHero = false,
  counts,
}: {
  contact: SiteSettings["contact"];
  businessName: string;
  overHero?: boolean;
  counts?: NavCounts;
}) {
  const pathname = usePathname();
  const onHomepage = pathname === "/";
  const links = useMemo(() => contactLinks(contact), [contact]);
  const activeSection = useActiveSection(TRACKED_SECTION_IDS);
  const isActive = (item: (typeof mainNav)[number]) =>
    onHomepage ? item.sectionId === activeSection : Boolean(item.href && pathname.startsWith(item.href));
  const [scrolled, setScrolled] = useState(false);
  const [overFilm, setOverFilm] = useState(overHero);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const filmToggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const cover = overHero ? document.querySelector("[data-hero-cover]") : null;
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      // Floating until the page content reaches the bottom of the header.
      if (cover) setOverFilm(cover.getBoundingClientRect().top > (headerRef.current?.offsetHeight ?? 0));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [overHero]);

  const floating = overHero && overFilm && !menuOpen;

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (!restoreFocus) return;
    const film = filmToggleRef.current;
    (film && film.offsetParent !== null ? film : toggleRef.current)?.focus();
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
      ref={headerRef}
      data-site-header
      data-floating={floating || undefined}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow] duration-300",
        floating ? "bg-transparent" : "bg-white",
        !floating &&
          (scrolled || menuOpen) &&
          "shadow-[0_1px_0_rgb(15_23_42/0.06),0_10px_30px_-18px_rgb(15_23_42/0.35)]",
      )}
    >
      {overHero ? (
        <FilmNavigation
          hidden={!floating}
          businessName={businessName}
          counts={counts}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          toggleRef={filmToggleRef}
        />
      ) : null}
      <div
        inert={floating}
        className={cn(
          "container-site flex h-(--header-h) items-center justify-between gap-4 transition-opacity duration-300 xl:gap-8",
          floating && "pointer-events-none opacity-0",
        )}
      >
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

/** Frosted-pill navigation floating over the hero film (Figma "Floating navigation"). */
function FilmNavigation({
  hidden,
  businessName,
  counts,
  menuOpen,
  onToggleMenu,
  toggleRef,
}: {
  hidden: boolean;
  businessName: string;
  counts?: NavCounts;
  menuOpen: boolean;
  onToggleMenu: () => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
}) {
  const badges: Partial<Record<string, { count: number; color: string }>> = counts
    ? {
        [sectionIds.products]: { count: counts.products, color: "bg-[#89a818]" },
        [sectionIds.brands]: { count: counts.brands, color: "bg-[#244aa5]" },
      }
    : {};
  // "Contact" becomes the white button at the end instead of a pill.
  const items = mainNav.filter((item) => item.sectionId !== sectionIds.contact);

  return (
    <div
      inert={hidden}
      className={cn(
        "absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-3 transition-opacity duration-300 md:p-4",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <a
        href={anchor(sectionIds.home)}
        aria-label={`${businessName} — back to top`}
        className="flex h-[42px] shrink-0 items-center gap-2 rounded-[10px] glass-pill pr-3 pl-2 text-white"
      >
        {/* 18 KB already; served as-is (the optimizer stalls encoding this mark as a 48px AVIF). */}
        <Image src={logoMark} alt="" unoptimized loading="eager" className="h-6 w-auto" />
        <span className="font-wide text-[11px] leading-[1.1] font-bold tracking-[-0.02em] uppercase">
          Ishita
          <br />
          Traders
        </span>
      </a>

      <nav
        aria-label="Primary"
        className="hidden items-center gap-px rounded-xl bg-black/8 p-0.5 backdrop-blur-[4px] xl:flex"
      >
        {items.map((item) => {
          const badge = badges[item.sectionId];
          return (
            <a
              key={item.sectionId}
              href={navHref(item, true)}
              className="flex h-[38px] items-center gap-1.5 rounded-[10px] glass-pill px-3 font-wide text-xs tracking-[-0.03em] text-white transition-colors duration-200 hover:bg-white/20"
            >
              {item.label}
              {badge && badge.count > 0 ? (
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full text-[10px] leading-none font-semibold",
                    badge.color,
                  )}
                >
                  {badge.count}
                </span>
              ) : null}
            </a>
          );
        })}
        <span aria-hidden="true" className="mx-1.5 h-4 w-px rounded-full bg-white/10" />
        <a
          href={anchor(sectionIds.contact)}
          className="group/contact flex h-[38px] items-center gap-2 rounded-[10px] bg-white px-3 font-wide text-xs tracking-[-0.03em] text-[#3d3d3d] transition-colors duration-200 hover:bg-white/90"
        >
          Contact us
          <span className="grid size-4 place-items-center overflow-hidden rounded-full bg-leaf-700 text-white">
            <ArrowRightIcon className="size-2 transition-transform duration-300 ease-out-expo group-hover/contact:translate-x-0.5" />
          </span>
        </a>
      </nav>

      <div className="flex items-center gap-2 xl:hidden">
        <a
          href={anchor(sectionIds.contact)}
          className="hidden h-[42px] items-center gap-2 rounded-[10px] bg-white px-3 font-wide text-xs tracking-[-0.03em] text-[#3d3d3d] sm:flex"
        >
          Contact us
          <span className="grid size-4 place-items-center rounded-full bg-leaf-700 text-white">
            <ArrowRightIcon className="size-2" />
          </span>
        </a>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={MENU_ID}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={onToggleMenu}
          className="flex h-[42px] items-center gap-2 rounded-[10px] bg-white px-3.5 font-wide text-xs tracking-[-0.03em] text-[#3d3d3d]"
        >
          <MenuIcon className="size-4" />
          Menu
        </button>
      </div>
    </div>
  );
}
