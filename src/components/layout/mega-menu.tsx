import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import { megaMenu, megaMenuHref, type MegaMenuGroup } from "@/content/mega-menu";
import { applyInOpenCatalogue } from "@/lib/catalogue-navigation";
import { cn } from "@/lib/cn";

import { ArrowIcon, ChevronRightIcon } from "./line-icons";
import { MenuCategoryIcon } from "./menu-icons";

/**
 * The Products mega menu (Figma 249:5579): a column per brand — logo, category groups, a product
 * shot — and a bar into the full catalogue. Every line opens the catalogue filtered to it.
 */
export function MegaMenuPanel({ onNavigate }: { onNavigate: () => void }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    applyInOpenCatalogue(event, href);
    onNavigate();
  };

  return (
    <div
      data-lenis-prevent
      className="max-h-[calc(100dvh-5.75rem)] overflow-y-auto overscroll-contain rounded-[24px] border border-[#e2e8f0] bg-white font-display text-[#0f172a] shadow-[0_28px_60px_-24px_rgb(15_35_80/0.32),0_10px_24px_-12px_rgb(15_35_80/0.12)]"
    >
      <div className="grid grid-cols-3 px-6 pt-8 pb-6 xl:px-8 xl:pt-9">
        {megaMenu.map((brand, index) => {
          const brandHref = megaMenuHref(brand.slug);
          return (
            <section
              key={brand.slug}
              aria-label={`${brand.name} products`}
              className={cn(
                "flex min-w-0 flex-col justify-between gap-7 px-5 xl:px-8",
                index === 0 && "pl-0 xl:pl-0",
                index === megaMenu.length - 1 && "pr-0 xl:pr-0",
                index > 0 && "border-l border-[#eef2f7]",
              )}
            >
              <div className="flex flex-col gap-5">
                <Link
                  href={brandHref}
                  prefetch={false}
                  onClick={(event) => follow(event, brandHref)}
                  className="group/brand flex h-[42px] items-center justify-between rounded-[10px] pr-2"
                >
                  <Image src={brand.logo.src} alt={brand.name} className={brand.logo.className} />
                  <ChevronRightIcon className="size-4 text-[#64748b] transition-transform duration-300 ease-out-expo group-hover/brand:translate-x-1 group-hover/brand:text-[#1e3a8a]" />
                </Link>
                <div className={cn("grid gap-4", brand.columns.length > 1 && "grid-cols-2")}>
                  {brand.columns.map((groups, column) => (
                    <div key={column} className="flex min-w-0 flex-col gap-4">
                      {groups.map((group) => (
                        <MenuGroup key={group.title} group={group} brand={brand.slug} onFollow={follow} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href={brandHref}
                prefetch={false}
                tabIndex={-1}
                aria-hidden="true"
                onClick={(event) => follow(event, brandHref)}
                className="group/shot relative block h-[150px] overflow-hidden rounded-[20px] bg-[#e5f5fd]"
              >
                <Image
                  src={brand.showcase.src}
                  alt=""
                  fill
                  sizes="360px"
                  className="object-contain p-3 transition-transform duration-700 ease-out-expo group-hover/shot:scale-105"
                />
              </Link>
            </section>
          );
        })}
      </div>
      <div className="mx-6 mb-6 flex items-center justify-between gap-4 rounded-[16px] bg-[#f3f7fc] py-3 pr-3 pl-5 xl:mx-8">
        <p className="text-[13.5px] leading-[1.45] text-[#475569]">
          Every product we stock, with search and filters for brand and category.
        </p>
        <Link
          href="/products"
          onClick={(event) => follow(event, "/products")}
          className="group/all inline-flex shrink-0 items-center gap-2 rounded-[11px] bg-[#1e3a8a] px-5 py-2.5 text-[14px] leading-5 font-semibold text-white transition-colors duration-300 hover:bg-[#172f72]"
        >
          Full catalogue
          <ArrowIcon className="size-4 transition-transform duration-300 ease-out-expo group-hover/all:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function MenuGroup({
  group,
  brand,
  onFollow,
}: {
  group: MegaMenuGroup;
  brand: string;
  onFollow: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[13px] leading-[19.5px] font-bold">
        <MenuCategoryIcon name={group.icon} className="h-3 w-[15px] shrink-0" />
        {group.title}
      </p>
      <ul className="flex flex-col gap-1.5 pl-1">
        {group.links.map((link) => {
          const href = megaMenuHref(brand, link);
          return (
            <li key={link.label}>
              <Link
                href={href}
                prefetch={false}
                onClick={(event) => onFollow(event, href)}
                className="group/link flex items-start gap-1.5 text-[13px] leading-[19.5px] font-medium text-[#475569] transition-colors duration-200 hover:text-[#1e3a8a]"
              >
                <ChevronRightIcon className="mt-[5px] size-2.5 shrink-0 text-[#94a3b8] transition-[translate,color] duration-200 group-hover/link:translate-x-0.5 group-hover/link:text-[#1e3a8a]" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
