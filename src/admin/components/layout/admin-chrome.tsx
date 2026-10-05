"use client";

import { ExternalLink, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import logo from "@/assets/images/brand/logo.png";
import { adminNav, type NavBadge } from "@/admin/config/navigation";
import { can } from "@/admin/config/permissions";
import { roleLabels, type Role } from "@/admin/content/types";
import { signOut } from "@/admin/features/auth/actions";
import { cn } from "@/lib/cn";

interface ChromeUser {
  name: string;
  email: string;
  role: Role;
}

/** Sidebar + top bar around every signed-in admin page. */
export function AdminChrome({
  user,
  badges,
  children,
}: {
  user: ChromeUser;
  badges: Partial<Record<NavBadge, number>>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The mobile drawer belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;
  const setMenuOpen = (open: boolean) => setOpenOn(open ? pathname : null);

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-svh bg-[#f5f8fc] lg:pl-[264px]">
      <a
        href="#admin-main"
        className="fixed top-3 left-3 z-[70] -translate-y-24 rounded-md bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-navy-950 text-white transition-transform duration-300 ease-out-expo lg:translate-x-0",
          menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-3 rounded-md">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white">
              <Image src={logo} alt="" className="h-7 w-auto" sizes="40px" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold">Ishita Traders</span>
              <span className="block text-[11px] font-semibold tracking-[0.12em] text-leaf-500 uppercase">
                Admin console
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          {adminNav.map((group) => {
            const items = group.items.filter((item) => can(user.role, item.permission));
            if (items.length === 0) return null;
            return (
              <div key={group.title} className="mb-5">
                <p className="px-3 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const count = item.badge ? (badges[item.badge] ?? 0) : 0;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/6 hover:text-white",
                          )}
                        >
                          {active ? (
                            <span
                              aria-hidden="true"
                              className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r bg-leaf-500"
                            />
                          ) : null}
                          <Icon
                            className={cn(
                              "size-[18px] shrink-0",
                              active ? "text-leaf-500" : "text-white/55 group-hover:text-white/80",
                            )}
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count > 0 ? (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[11px] leading-none font-bold",
                                item.badge === "samples" ? "bg-amber-400/90 text-navy-950" : "bg-leaf-600 text-white",
                              )}
                              title={item.badge === "samples" ? "Sample reviews to replace" : "Unread"}
                            >
                              {count > 99 ? "99+" : count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/6 hover:text-white"
          >
            <ExternalLink className="size-[18px] text-white/55" aria-hidden="true" />
            View live website
          </a>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
            aria-controls="admin-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>

          <form action="/admin/search" method="get" role="search" className="relative max-w-md flex-1">
            <label htmlFor="admin-search" className="sr-only">
              Search the admin
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              type="search"
              name="q"
              placeholder="Search products, enquiries, messages…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/account"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100"
              title="Your account"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white"
                aria-hidden="true"
              >
                {initials(user.name) || <UserRound className="size-4" />}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-40 truncate text-sm font-semibold text-navy-950">{user.name}</span>
                <span className="block text-[11px] font-medium text-slate-500">{roleLabels[user.role]}</span>
              </span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-[18px]" />
              </button>
            </form>
          </div>
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
