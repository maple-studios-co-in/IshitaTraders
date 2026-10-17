import type { StaticImageData } from "next/image";

import exideBattery from "@/assets/images/menu/exide-battery.webp";
import exideLogo from "@/assets/images/menu/exide-logo.png";
import microtekInverter from "@/assets/images/menu/microtek-inverter.webp";
import microtekLogo from "@/assets/images/menu/microtek-logo.png";
import utlBattery from "@/assets/images/menu/utl-battery.webp";
import utlLogo from "@/assets/images/menu/utl-logo.png";
import type { MenuIconName } from "@/components/layout/menu-icons";

/**
 * The Products mega menu (Figma zj4F9WF6L3bOUAsZTbe9xJ, 249:5579): one column per brand. Each line
 * opens the catalogue on that brand, narrowed by `category` (catalogue category slugs) and/or a
 * search `q`; a line with neither shows the whole brand.
 */

export interface MegaMenuLink {
  label: string;
  q?: string;
  category?: string[];
}

export interface MegaMenuGroup {
  title: string;
  icon: MenuIconName;
  links: MegaMenuLink[];
}

export interface MegaMenuBrand {
  /** Catalogue brand slug (Admin → Brands). */
  slug: "exide" | "utl" | "microtek";
  name: string;
  logo: { src: StaticImageData; className: string };
  /** Groups per sub-column: Exide's list runs in two narrow columns, the others in one. */
  columns: MegaMenuGroup[][];
  showcase: { src: StaticImageData; alt: string };
}

export const megaMenu: MegaMenuBrand[] = [
  {
    slug: "exide",
    name: "Exide",
    logo: { src: exideLogo, className: "h-[19.5px] w-auto" },
    columns: [
      [
        {
          title: "Automotive Batteries",
          icon: "car",
          links: [
            { label: "Four Wheeler Batteries", q: "four wheeler" },
            { label: "Three Wheeler Batteries", q: "three wheeler" },
            { label: "Two Wheeler Batteries", q: "two wheeler" },
            { label: "Exide Neo", q: "neo" },
          ],
        },
        {
          title: "Inverter Systems",
          icon: "cog",
          links: [
            { label: "Lower KVA", category: ["inverters"] },
            { label: "Higher KVA", category: ["inverters", "online-ups"] },
            { label: "User Manual", q: "manual" },
          ],
        },
        {
          title: "Inverter Batteries",
          icon: "battery",
          links: [{ label: "Tubular Inverter Batteries", q: "tubular" }],
        },
      ],
      [
        {
          title: "Institutional UPS Batteries",
          icon: "server",
          links: [
            { label: "Exide NXT+ Range", q: "nxt" },
            { label: "Exide Powersafe Plus Range", q: "powersafe" },
            { label: "Exide Powersafe EHP Range - Battery for Data Centre", q: "ehp" },
            { label: "Flooded 6EL Range", q: "6el" },
            { label: "Flooded 6EL Plus Range", q: "6el plus" },
          ],
        },
        {
          title: "Genset Batteries",
          icon: "genset",
          links: [{ label: "Exide Genplus", q: "genplus" }],
        },
      ],
    ],
    showcase: { src: exideBattery, alt: "Exide EPIQ automotive battery" },
  },
  {
    slug: "utl",
    name: "UTL Solar",
    logo: { src: utlLogo, className: "h-[21.5px] w-auto" },
    columns: [
      [
        {
          title: "Solar Products",
          icon: "solar",
          links: [
            { label: "Solar Panels", category: ["solar-panels"] },
            { label: "Solar Inverters", category: ["solar-inverters"] },
            { label: "Solar PCU", q: "pcu" },
            { label: "Solar Charge Controllers", q: "controller" },
            { label: "Solar Structure & Accessories", q: "structure" },
          ],
        },
        {
          title: "Inverter & UPS Systems",
          icon: "cog",
          links: [
            { label: "Home Inverters", category: ["inverters"] },
            { label: "Online UPS", category: ["online-ups"] },
            { label: "Offline UPS", q: "offline" },
          ],
        },
        {
          title: "Batteries",
          icon: "battery",
          links: [
            { label: "Tubular Batteries", q: "tubular" },
            { label: "SMF Batteries", q: "smf" },
          ],
        },
      ],
    ],
    showcase: { src: utlBattery, alt: "UTL tall tubular inverter battery" },
  },
  {
    slug: "microtek",
    name: "Microtek",
    logo: { src: microtekLogo, className: "h-[37px] w-auto" },
    columns: [
      [
        {
          title: "Inverter Systems",
          icon: "wave",
          links: [
            { label: "Home Inverters", category: ["inverters"] },
            { label: "High Capacity Inverters", q: "kva" },
            { label: "Sinewave Inverters", q: "sine" },
            { label: "Hybrid Inverters", q: "hybrid" },
            { label: "Inverter with Built-in UPS", q: "ups" },
          ],
        },
        {
          title: "UPS Systems",
          icon: "plug",
          links: [
            { label: "Online UPS", category: ["online-ups"] },
            { label: "Offline UPS", q: "offline" },
            { label: "Line Interactive UPS", q: "line interactive" },
          ],
        },
        {
          title: "Solar",
          icon: "battery",
          links: [
            { label: "Tubular Batteries", q: "tubular" },
            { label: "SMF Batteries", q: "smf" },
          ],
        },
      ],
    ],
    showcase: { src: microtekInverter, alt: "Microtek solar inverter" },
  },
];

/** The catalogue on a brand, optionally narrowed (see MegaMenuLink). */
export function megaMenuHref(brand: string, link?: MegaMenuLink) {
  const params = new URLSearchParams({ brand });
  if (link?.category?.length) params.set("category", link.category.join(","));
  if (link?.q) params.set("q", link.q);
  return `/products?${params.toString()}`;
}
