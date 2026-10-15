"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import logoMark from "@/assets/images/brand/logo-mark.png";
import { contactLinks } from "@/admin/content/links";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { ArrowIcon, CloseLineIcon, MenuLinesIcon } from "@/components/home/icons";
import { SmartLink } from "@/components/ui/smart-link";
import {
  anchor,
  contactNav,
  mainNav,
  navCount,
  navHref,
  sectionIds,
  type NavItem,
  type NavLink,
  type SectionId,
} from "@/config/navigation";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/cn";
import { lockScroll } from "@/lib/smooth-scroll";

// Sections that light up a pill while they're being read; the rest keep the previous one lit.
const TRACKED_SECTION_IDS: SectionId[] = [
  sectionIds.home,
  sectionIds.about,
  sectionIds.calculator,
  sectionIds.products,
  sectionIds.customers,
  sectionIds.applications,
  sectionIds.director,
  sectionIds.faq,
  sectionIds.contact,
];
const MENU_ID = "site-menu";
const EASE = [0.16, 1, 0.3, 1] as const;

type Tone = "dark" | "light";

/**
 * The floating navigation of Figma "Hero / Opening": a wordmark pill and pill links. Over the
 * hero film (`overHero`, homepage) the pills are night blue; once the page slides over the film
 * (`[data-hero-cover]`) — and on every other page — they turn white. Below 1024 px a Menu button
 * opens the links as a sheet. "Contact us" scrolls to the contact section every page ends with.
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
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

  // Dropdowns close on Escape and on any click outside them.
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.("[data-nav-group]")) setOpenGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelector<HTMLElement>(`[data-nav-group="${openGroup}"] > button`)?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  const tone: Tone = overHero && overFilm ? "dark" : "light";
  const isActive = (link: NavLink) =>
    onHomepage ? !link.href && link.sectionId === activeSection : Boolean(link.href && pathname.startsWith(link.href));
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
          {mainNav.map((item) =>
            item.children ? (
              <NavGroup
                key={item.label}
                item={item}
                tone={tone}
                open={openGroup === item.label}
                onOpenChange={(open) => setOpenGroup(open ? item.label : null)}
                onHomepage={onHomepage}
                active={showActive && item.children.some(isActive)}
              />
            ) : (
              <a
                key={item.label}
                href={navHref(item, onHomepage)}
                aria-current={showActive && isActive(item) ? "true" : undefined}
                className={pillClasses(tone, showActive && isActive(item), item.label.length > 7)}
              >
                {item.label}
              </a>
            ),
          )}
          <ContactLink tone={tone} />
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

/** Figma "Navigation / Pill": 40 px tall, 94 px wide (115 px for longer labels or a badge). */
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
    <a
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
    </a>
  );
}

function ContactLink({ tone }: { tone: Tone }) {
  return (
    <a
      href={anchor(contactNav.sectionId)}
      className={cn(
        "group/action ml-[3px] flex h-[52px] w-[135px] items-center justify-between rounded-[12px] pr-3 pl-4 text-[14px] leading-[1.5] whitespace-nowrap transition-colors duration-300",
        tone === "dark" ? "bg-white text-ish-ink hover:bg-ish-pale" : "bg-ish-blue text-white hover:bg-ish-blue-deep",
      )}
    >
      {contactNav.label}
      <ArrowIcon className="size-[18px] transition-transform duration-300 ease-out-expo group-hover/action:translate-x-1" />
    </a>
  );
}

function CountBadge({ count, tone }: { count: number; tone: "lime" | "blue" }) {
  return (
    <span
      className={cn(
        "grid size-[17px] place-items-center rounded-full text-[10px] leading-none font-bold tabular-nums",
        tone === "lime" ? "bg-ish-lime text-[#132407]" : "bg-ish-blue text-white",
      )}
    >
      {count}
    </span>
  );
}

/** A pill that opens a white dropdown: on hover with a mouse, on click or Enter otherwise. */
function NavGroup({
  item,
  tone,
  open,
  onOpenChange,
  onHomepage,
  active,
}: {
  item: NavItem;
  tone: Tone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHomepage: boolean;
  active: boolean;
}) {
  const id = useId();
  const closeTimer = useRef(0);
  const count = navCount(item);
  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    onOpenChange(true);
  };
  const onPointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => onOpenChange(false), 160);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      data-nav-group={item.label}
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className={pillClasses(tone, active || open, true)}
      >
        {item.label}
        {count > 0 ? (
          <CountBadge count={count} tone={item.sectionId === sectionIds.products ? "lime" : "blue"} />
        ) : null}
      </button>
      {/* The gap under the pill is part of the hover area, so the pointer can travel into the list. */}
      <div id={id} hidden={!open} className="absolute top-full left-0 pt-[9px]">
        <ul className="w-[220px] animate-[dropdown-in_180ms_var(--ease-out-expo)] rounded-[12px] bg-white p-2 text-ish-ink shadow-[0_12px_28px_rgb(11_29_54/0.19)]">
          {item.children?.map((child) => (
            <li key={child.label}>
              <SmartLink
                href={navHref(child, onHomepage)}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center justify-between rounded-[7px] px-3 py-3 text-[14px] leading-[1.3] transition-colors hover:bg-ish-pale hover:text-ish-blue",
                  child.href && "mt-1 border-t border-ish-line/60 pt-3.5 text-ish-blue",
                )}
              >
                {child.label}
                {child.href ? <ArrowIcon className="size-4" /> : null}
              </SmartLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Phones and tablets: the design's white menu sheet under the wordmark, with the links as pale
 * pills (Products and Solutions expand in place), the blue Contact button and quick call /
 * WhatsApp actions. The rest of the page is inert while it is open; Tab stays inside.
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
  isActive: (link: NavLink) => boolean;
  phoneHref: string;
  phoneDisplay: string;
  whatsappHref: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
      setExpanded(null);
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
            <a
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
            </a>
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
            className="mx-[13px] mt-3 mb-6 rounded-[17px] bg-white p-3 text-ish-ink shadow-[0_15px_25px_rgb(2_18_38/0.19)] min-[390px]:mx-[17px]"
          >
            <ul className="flex flex-col gap-1">
              {mainNav.map((item) => {
                if (!item.children) {
                  const active = isActive(item);
                  return (
                    <li key={item.label}>
                      <a
                        href={navHref(item, onHomepage)}
                        onClick={() => onClose()}
                        aria-current={active ? "true" : undefined}
                        className={linkClasses(active)}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                }
                const groupOpen = expanded === item.label;
                const count = navCount(item);
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      aria-expanded={groupOpen}
                      onClick={() => setExpanded(groupOpen ? null : item.label)}
                      className={linkClasses(false)}
                    >
                      {item.label}
                      <span className="flex items-center gap-2">
                        {count > 0 ? (
                          <CountBadge count={count} tone={item.sectionId === sectionIds.products ? "lime" : "blue"} />
                        ) : null}
                        <svg
                          viewBox="0 0 16 16"
                          aria-hidden="true"
                          className={cn("size-4 transition-transform duration-300", groupOpen && "rotate-180")}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m4 6 4 4 4-4" />
                        </svg>
                      </span>
                    </button>
                    {groupOpen ? (
                      <ul className="mt-1 rounded-[11px] bg-[#f5f8fc] px-3 py-2">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <SmartLink
                              href={navHref(child, onHomepage)}
                              onClick={() => onClose()}
                              className={cn(
                                "flex items-center justify-between rounded-[7px] px-3 py-3 text-[15px] leading-[1.3] active:bg-ish-pale",
                                child.href && "text-ish-blue",
                              )}
                            >
                              {child.label}
                              {child.href ? <ArrowIcon className="size-4" /> : null}
                            </SmartLink>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
              <li className="mt-1">
                <a
                  href={anchor(contactNav.sectionId)}
                  onClick={() => onClose()}
                  className="flex min-h-[52px] items-center justify-between rounded-[12px] bg-ish-blue px-4 text-[16px] text-white"
                >
                  {contactNav.label}
                  <ArrowIcon className="size-[18px]" />
                </a>
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
