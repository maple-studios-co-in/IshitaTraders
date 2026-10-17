"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import logoMark from "@/assets/images/brand/logo-mark.png";
import { contactLinks } from "@/admin/content/links";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { SmartLink } from "@/components/ui/smart-link";
import { anchor, contactNav, mainNav, navHref, pageLinks, sectionIds, type NavItem } from "@/config/navigation";
import { megaMenu, megaMenuHref } from "@/content/mega-menu";
import { useActiveSection } from "@/hooks/use-active-section";
import { applyInOpenCatalogue } from "@/lib/catalogue-navigation";
import { cn } from "@/lib/cn";
import { lockScroll } from "@/lib/smooth-scroll";

import { ArrowIcon, ChevronDownIcon, CloseLineIcon, MenuLinesIcon } from "./line-icons";
import { MegaMenuPanel } from "./mega-menu";

// Every homepage section takes part, so Home and About Us light up only while they're being read.
const TRACKED_SECTION_IDS = Object.values(sectionIds);
const MENU_ID = "site-menu";
const EASE = [0.16, 1, 0.3, 1] as const;

type Tone = "dark" | "light";

/**
 * The floating navigation of Figma "Hero / Opening": a wordmark pill and pill links. Over the
 * hero film (`overHero`, homepage) the pills are night blue; once the page slides over the film
 * (`[data-hero-cover]`) — and on every other page — they turn white. Products opens the brand mega
 * menu; Contact is the button at the end. Below 1024 px a Menu button opens the links as a sheet.
 */
export function SiteHeader({
  contact,
  businessName,
  overHero = false,
}: {
  contact: SiteSettings["contact"];
  businessName: string;
  overHero?: boolean;
}) {
  const pathname = usePathname();
  const onHomepage = pathname === "/";
  const links = useMemo(() => contactLinks(contact), [contact]);
  const activeSection = useActiveSection(TRACKED_SECTION_IDS);
  const [overFilm, setOverFilm] = useState(overHero);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!overHero) return;
    const cover = document.querySelector("[data-hero-cover]");
    if (!cover) return;
    const onScroll = () => setOverFilm(cover.getBoundingClientRect().top > (headerRef.current?.offsetHeight ?? 0) / 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [overHero]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  const tone: Tone = overHero && overFilm ? "dark" : "light";
  const isActive = (item: NavItem) =>
    item.href
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : onHomepage && item.sectionId === activeSection;
  // Over the film every pill stays night blue, as designed; the reading position shows once off it.
  const showActive = tone === "light";
  const homeHref = onHomepage ? anchor(sectionIds.home) : "/";

  return (
    <header
      ref={headerRef}
      data-site-header
      data-tone={tone}
      className="pointer-events-none sticky top-0 z-50 h-(--header-h) font-archivo"
    >
      <div className="flex items-start justify-between gap-3 px-[13px] pt-[17px] min-[390px]:px-[17px]">
        <Wordmark href={homeHref} tone={tone} businessName={businessName} onHomepage={onHomepage} />

        <nav aria-label="Primary" className="pointer-events-auto hidden items-start gap-[5px] lg:flex">
          {mainNav.map((item) => {
            const active = showActive && isActive(item);
            return item.megaMenu ? (
              <ProductsMenu key={item.label} item={item} tone={tone} active={active} pathname={pathname} />
            ) : (
              <SmartLink
                key={item.label}
                href={navHref(item, onHomepage)}
                aria-current={active ? "page" : undefined}
                className={pillClasses(tone, active, item.label.length > 7)}
              >
                {item.label}
              </SmartLink>
            );
          })}
          <ContactLink tone={tone} active={showActive && isActive(contactNav)} />
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={MENU_ID}
          onClick={() => setMenuOpen(true)}
          className="pointer-events-auto flex h-[52px] w-[85px] shrink-0 items-center justify-between rounded-[12px] bg-white pr-3 pl-4 text-[14px] leading-[1.5] text-ish-ink shadow-[0_8px_24px_-12px_rgb(8_20_44/0.35)] transition-colors hover:bg-ish-pale lg:hidden"
        >
          Menu
          <MenuLinesIcon className="size-[18px]" />
        </button>
      </div>

      <SiteMenu
        open={menuOpen}
        onClose={closeMenu}
        homeHref={homeHref}
        businessName={businessName}
        onHomepage={onHomepage}
        isActive={isActive}
        phoneHref={links.phone}
        phoneDisplay={contact.phoneDisplay}
        whatsappHref={links.whatsapp()}
      />
    </header>
  );
}

/** Figma "Navigation / Pill": 40 px tall, 94 px wide (115 px for longer labels). */
function pillClasses(tone: Tone, active = false, wide = false) {
  return cn(
    "flex h-10 items-center justify-between gap-2 rounded-[11px] pr-3 pl-4 text-[12px] leading-[1.5] whitespace-nowrap transition-[background-color,color,box-shadow] duration-300",
    wide ? "min-w-[115px]" : "min-w-[94px]",
    tone === "dark"
      ? "bg-ish-deep text-white hover:bg-ish-blue"
      : "bg-white/92 text-ish-ink shadow-[0_2px_10px_rgb(18_43_85/0.08)] backdrop-blur-md hover:bg-[#dce9fc]",
    active && "bg-ish-pale text-ish-blue",
  );
}

function Wordmark({
  href,
  tone,
  businessName,
  onHomepage,
}: {
  href: string;
  tone: Tone;
  businessName: string;
  onHomepage: boolean;
}) {
  return (
    <SmartLink
      href={href}
      aria-label={`${businessName} — ${onHomepage ? "back to top" : "home"}`}
      className={cn(
        "pointer-events-auto flex w-[135px] shrink-0 items-start gap-[7px] rounded-[12px] p-[7px] transition-[background-color,color,box-shadow] duration-300 lg:w-[150px]",
        tone === "dark"
          ? "bg-ish-deep text-white"
          : "bg-white/92 text-ish-ink shadow-[0_2px_10px_rgb(18_43_85/0.08)] backdrop-blur-md",
      )}
    >
      {/* Served as-is: the optimizer stalls encoding this small mark as AVIF. */}
      <Image src={logoMark} alt="" unoptimized loading="eager" className="h-[29px] w-[27px] object-contain" />
      <span className="text-[17px] leading-[1.5] font-bold lg:text-[18px]">
        <span className="block">ISHITA</span>
        <span className="block">TRADERS</span>
      </span>
    </SmartLink>
  );
}

function ContactLink({ tone, active }: { tone: Tone; active: boolean }) {
  return (
    <SmartLink
      href={pageLinks.contact}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/action ml-[3px] flex h-[52px] w-[135px] items-center justify-between rounded-[12px] pr-3 pl-4 text-[14px] leading-[1.5] whitespace-nowrap transition-colors duration-300",
        tone === "dark" ? "bg-white text-ish-ink hover:bg-ish-pale" : "bg-ish-blue text-white hover:bg-ish-blue-deep",
        active && "bg-ish-blue-deep",
      )}
    >
      {contactNav.label}
      <ArrowIcon className="size-[18px] transition-transform duration-300 ease-out-expo group-hover/action:translate-x-1" />
    </SmartLink>
  );
}

/**
 * The Products pill and its mega menu. A mouse opens it on hover (and a click then goes to the
 * catalogue); touch and keyboard toggle it like a disclosure. Escape, a click outside or focus
 * leaving it closes it.
 */
function ProductsMenu({
  item,
  tone,
  active,
  pathname,
}: {
  item: NavItem;
  tone: Tone;
  active: boolean;
  pathname: string;
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef(0);
  const openedByHover = useRef(false);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    openedByHover.current = false;
    setOpen(false);
  }, []);

  // A new page closes it.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!groupRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (groupRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    if (!open) openedByHover.current = true;
    setOpen(true);
  };
  const onPointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(close, 180);
  };
  const onClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // A mouse click on the pill whose menu the hover already opened means "take me there".
    if (open && openedByHover.current && event.detail > 0) {
      close();
      router.push(item.href ?? pageLinks.products);
      return;
    }
    openedByHover.current = false;
    setOpen(!open);
  };

  return (
    <div
      ref={groupRef}
      data-nav-group={item.label}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // Focus moving on to another control closes it; a tap on the panel's blank space doesn't.
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !groupRef.current?.contains(next)) close();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onClick}
        className={pillClasses(tone, active || open, true)}
      >
        {item.label}
        <ChevronDownIcon className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
      </button>
      {/* Spans the header so the panel can centre on the page; its top padding bridges the hover. */}
      <div id={id} hidden={!open} className="absolute inset-x-0 top-[57px] px-4 pt-[18px] lg:px-6">
        <div className="mx-auto w-full max-w-[1208px] animate-[dropdown-in_200ms_var(--ease-out-expo)]">
          <MegaMenuPanel onNavigate={close} />
        </div>
      </div>
    </div>
  );
}

/**
 * Phones and tablets: the design's white menu sheet under the wordmark, with the links as pale
 * pills (Products expands to the catalogue and its brands), the blue Contact button and quick
 * call / WhatsApp actions. The rest of the page is inert while it is open; Tab stays inside.
 */
function SiteMenu({
  open,
  onClose,
  homeHref,
  businessName,
  onHomepage,
  isActive,
  phoneHref,
  phoneDisplay,
  whatsappHref,
}: {
  open: boolean;
  onClose: (restoreFocus?: boolean) => void;
  homeHref: string;
  businessName: string;
  onHomepage: boolean;
  isActive: (item: NavItem) => boolean;
  phoneHref: string;
  phoneDisplay: string;
  whatsappHref: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const background = document.querySelectorAll<HTMLElement>("[data-page-content]");
    background.forEach((el) => (el.inert = true));
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(true);
    };
    const wide = window.matchMedia("(min-width: 64rem)");
    const onBreakpoint = () => wide.matches && onClose();
    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onBreakpoint);
    return () => {
      lockScroll(false);
      background.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onBreakpoint);
      setProductsOpen(false);
    };
  }, [open, onClose]);

  // Keep keyboard focus inside the open menu.
  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button")].filter(
      (el) => el.offsetParent !== null,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const linkClasses = (active: boolean) =>
    cn(
      "flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[11px] px-[15px] py-3 text-left text-[16px] leading-[1.3] transition-colors",
      active ? "bg-ish-blue text-white" : "bg-[#edf4fc] text-ish-ink active:bg-[#dce9fc]",
    );
  const follow = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    applyInOpenCatalogue(event, href);
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="site-menu"
          id={MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onKeyDown={trapFocus}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-ish-deep/45 backdrop-blur-[3px] lg:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose(true);
          }}
        >
          <div className="flex items-start justify-between gap-3 px-[13px] pt-[17px] min-[390px]:px-[17px]">
            <SmartLink
              href={homeHref}
              onClick={() => onClose()}
              aria-label={`${businessName} — ${onHomepage ? "back to top" : "home"}`}
              className="flex w-[135px] shrink-0 items-start gap-[7px] rounded-[12px] bg-white p-[7px] text-ish-ink"
            >
              <Image src={logoMark} alt="" unoptimized className="h-[29px] w-[27px] object-contain" />
              <span className="text-[17px] leading-[1.5] font-bold">
                <span className="block">ISHITA</span>
                <span className="block">TRADERS</span>
              </span>
            </SmartLink>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => onClose(true)}
              className="flex h-[52px] w-[85px] shrink-0 items-center justify-between rounded-[12px] bg-white pr-3 pl-4 text-[14px] leading-[1.5] text-ish-ink"
            >
              Close
              <CloseLineIcon className="size-[18px]" />
            </button>
          </div>

          <m.nav
            aria-label="Menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mx-[13px] mt-3 mb-6 rounded-[17px] bg-white p-3 text-ish-ink shadow-[0_15px_25px_rgb(2_18_38/0.19)] min-[390px]:mx-[17px] sm:mx-auto sm:max-w-[30rem]"
          >
            <ul className="flex flex-col gap-1">
              {mainNav.map((item) => {
                const active = isActive(item);
                if (!item.megaMenu) {
                  return (
                    <li key={item.label}>
                      <SmartLink
                        href={navHref(item, onHomepage)}
                        onClick={() => onClose()}
                        aria-current={active ? "page" : undefined}
                        className={linkClasses(active)}
                      >
                        {item.label}
                      </SmartLink>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      aria-expanded={productsOpen}
                      onClick={() => setProductsOpen((value) => !value)}
                      className={linkClasses(active)}
                    >
                      {item.label}
                      <ChevronDownIcon
                        className={cn("size-4 transition-transform duration-300", productsOpen && "rotate-180")}
                      />
                    </button>
                    {productsOpen ? (
                      <ul className="mt-1 rounded-[11px] bg-[#f5f8fc] px-2 py-2">
                        <li>
                          <SmartLink
                            href={pageLinks.products}
                            onClick={(event) => follow(event, pageLinks.products)}
                            className="flex items-center justify-between rounded-[8px] px-3 py-3 text-[15px] leading-[1.3] font-semibold text-ish-blue active:bg-ish-pale"
                          >
                            Full catalogue
                            <ArrowIcon className="size-4" />
                          </SmartLink>
                        </li>
                        {megaMenu.map((brand) => {
                          const href = megaMenuHref(brand.slug);
                          return (
                            <li key={brand.slug} className="border-t border-ish-line/50">
                              <SmartLink
                                href={href}
                                onClick={(event) => follow(event, href)}
                                className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-[15px] leading-[1.3] active:bg-ish-pale"
                              >
                                <span className="flex flex-col">
                                  {brand.name}
                                  <span className="text-[12.5px] text-ish-muted">
                                    {brand.columns
                                      .flat()
                                      .map((group) => group.title)
                                      .join(" · ")}
                                  </span>
                                </span>
                                <Image
                                  src={brand.logo.src}
                                  alt=""
                                  className="h-[18px] w-auto max-w-[84px] shrink-0 object-contain"
                                />
                              </SmartLink>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
              <li className="mt-1">
                <SmartLink
                  href={pageLinks.contact}
                  onClick={() => onClose()}
                  aria-current={isActive(contactNav) ? "page" : undefined}
                  className="flex min-h-[52px] items-center justify-between rounded-[12px] bg-ish-blue px-4 text-[16px] text-white"
                >
                  {contactNav.label}
                  <ArrowIcon className="size-[18px]" />
                </SmartLink>
              </li>
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ish-line/70 pt-3">
              <QuickAction href={phoneHref} label={`Call ${phoneDisplay}`} icon={<PhoneIcon className="size-4" />}>
                Call
              </QuickAction>
              <QuickAction
                href={whatsappHref}
                external
                label="WhatsApp us (opens WhatsApp)"
                icon={<WhatsAppIcon className="size-4" />}
              >
                WhatsApp
              </QuickAction>
            </div>
          </m.nav>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function QuickAction({
  href,
  label,
  icon,
  external,
  children,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-12 items-center justify-center gap-2 rounded-[11px] bg-ish-pale text-[14px] text-ish-blue active:bg-[#dce9fc]"
    >
      {icon}
      {children}
    </a>
  );
}
