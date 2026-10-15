import type { StaticImageData } from "next/image";

import batteryPhoto from "@/assets/images/home/battery-product.webp";
import electricalPhoto from "@/assets/images/home/electrical-product.webp";
import inverterInside from "@/assets/images/home/inverter-inside.webp";
import inverterPhoto from "@/assets/images/home/inverter-product.webp";
import lithiumPhoto from "@/assets/images/home/microtek-lithium-battery.webp";
import projectCommercial from "@/assets/images/home/project-commercial.webp";
import projectHome from "@/assets/images/home/project-home.webp";
import projectInstitution from "@/assets/images/home/project-institution.webp";
import solarLayers from "@/assets/images/home/solar-layers.webp";
import solarPhoto from "@/assets/images/home/solar-product.webp";
import rooftopScene from "@/assets/images/home/solar-rooftop.webp";
import teamPhoto from "@/assets/images/home/solar-installation-team.webp";
import upsPhoto from "@/assets/images/home/ups-product.webp";

import { anchor, sectionIds, type SectionId } from "@/config/navigation";

/**
 * Copy and imagery for the homepage sections below the hero film, as designed in Figma
 * coBLUmSDJE5yrXgsWcbpCF (Desktop / 1440 px and Mobile / 390 px). Business facts (phone, email,
 * address, founding year), customer stories, FAQs and brands come from the admin instead.
 */

export interface Picture {
  src: StaticImageData;
  alt: string;
}

export type FactIcon = "pin" | "bolt" | "shield" | "bag";

/** {locality}, {region} and {foundedYear} are filled in from Admin → Business. */
export const aboutIntro = {
  label: "What is ISHITA",
  manifesto:
    "Ishita Traders brings reliable energy closer to you. Solar, batteries, inverters and electrical solutions — for homes, businesses and institutions.",
  facts: [
    { icon: "pin", lines: ["Locally based.", "{locality}, {region}."] },
    { icon: "bolt", lines: ["Power solutions", "since {foundedYear}."] },
    { icon: "shield", lines: ["Trusted brands.", "Genuine products."] },
    { icon: "bag", lines: ["One partner.", "Complete power needs."] },
  ] satisfies { icon: FactIcon; lines: [string, string] }[],
};

export interface CalculatorField {
  id: "area" | "rate" | "watts" | "footprint" | "sun" | "efficiency";
  label: string;
  /** Written around the number, as in the design: "₹8 / kWh", "30 m²", "80%". */
  prefix?: string;
  suffix: string;
  /** How a screen reader announces the unit. */
  unit: string;
  value: number;
  min: number;
  max: number;
}

/** Solar estimate: the design's defaults and limits (panels × panel power × sun hours × efficiency). */
export const calculator = {
  titleLines: ["Estimate your", "solar potential."],
  lead: "Explore what a rooftop solar system could generate using your own assumptions.",
  fields: [
    { id: "area", label: "Usable roof area", suffix: " m²", unit: "square metres", value: 30, min: 0, max: 10000 },
    {
      id: "rate",
      label: "Electricity rate",
      prefix: "₹",
      suffix: " / kWh",
      unit: "rupees per kilowatt-hour",
      value: 8,
      min: 0,
      max: 100,
    },
    { id: "watts", label: "Panel power", suffix: " W", unit: "watts", value: 550, min: 100, max: 1000 },
    { id: "footprint", label: "Area per panel", suffix: " m²", unit: "square metres", value: 2.6, min: 0.5, max: 5 },
    { id: "sun", label: "Peak sun hours", suffix: " h / day", unit: "hours a day", value: 4.5, min: 0, max: 10 },
    { id: "efficiency", label: "System efficiency", suffix: "%", unit: "percent", value: 80, min: 1, max: 100 },
  ] satisfies CalculatorField[],
  periods: [
    { days: 1, label: "Per day" },
    { days: 30, label: "Per month" },
    { days: 365, label: "Per year" },
  ],
  results: { value: "Potential electricity value", energy: "Estimated energy generation", panels: "Number of panels" },
  cta: "Explore your options",
  /** The contact form's "Interested in" choice the button selects. */
  interest: "Solar panels",
  note: "Illustrative defaults, not a site assessment or guaranteed bill savings. Roof access, shade, weather, consumption and tariffs affect actual results.",
};

export type CalculatorFieldId = CalculatorField["id"];

export const localService = {
  label: "Closer to your power needs.",
  statement: ["Practical guidance. Trusted products.", "A team you can speak to, right here."],
  card: {
    image: { src: solarPhoto, alt: "Solar panels on a rooftop stand" } satisfies Picture,
    title: "Generate. Convert. Store.",
    subtitle: "One connected energy system.",
  },
  steps: [
    { title: "Understand", text: "Start with your space and power needs." },
    { title: "Choose", text: "Match the right products to your system." },
    { title: "Connect", text: "Discuss installation and compatibility." },
    { title: "Power on", text: "Get practical advice from our local team." },
  ],
  cta: { label: "Talk to our team", href: anchor(sectionIds.contact) },
};

export const everydayEnergy = {
  title: "Everyday energy.",
  subtitle: "Made for the way you live.",
  image: {
    src: rooftopScene,
    alt: "Illustrative aerial view of rooftop solar on a commercial building",
  } satisfies Picture,
  benefits: [
    "Put your rooftop to work.",
    "Power your essential appliances.",
    "Explore reliable backup options.",
    "Find guidance close to home.",
  ],
};

export interface LineupView {
  /** Tab label, e.g. "Assembled". */
  label: string;
  image: Picture;
  /** Cut-out renders of the 3D models get breathing room; photographs fill their frame. */
  kind: "photo" | "render";
  /** Overrides for this view (the UPS card's second view is a different product line). */
  title?: string;
  categories?: string[];
  interest?: string;
}

export interface LineupProduct {
  id: SectionId;
  caption: string;
  title: string;
  /**
   * Catalogue categories (slugs) that "Explore options" opens. When none of them has a published
   * product yet, the button asks about the product in the enquiry form instead.
   */
  categories: string[];
  /** The contact form's "Interested in" choice for this product. */
  interest: string;
  note: string;
  views: [LineupView, LineupView];
}

export const productLineup = {
  label: "Product lineup.",
  statement: ["Different power needs.", "One place to explore."],
  cta: "Explore options",
  products: [
    {
      id: sectionIds.solar,
      caption: "Capture more from every day.",
      title: "Solar panels",
      categories: ["solar-panels"],
      interest: "Solar panels",
      note: "Representative model. Internal layout is illustrative.",
      views: [
        { label: "Assembled", kind: "photo", image: { src: solarPhoto, alt: "Solar panels on a rooftop stand" } },
        {
          label: "Layers",
          kind: "render",
          image: { src: solarLayers, alt: "Solar panel separated into its glass, cell and backing layers" },
        },
      ],
    },
    {
      id: sectionIds.inverters,
      caption: "Power, connected.",
      title: "Inverters",
      categories: ["solar-inverters", "inverters"],
      interest: "Inverters",
      note: "Representative model. Internal layout is illustrative.",
      views: [
        {
          label: "Hybrid inverter",
          kind: "photo",
          image: { src: inverterPhoto, alt: "UTL Solar hybrid inverter on a wall" },
        },
        {
          label: "View inside",
          kind: "render",
          image: { src: inverterInside, alt: "Illustrative inside view of an inverter's circuit board" },
        },
      ],
    },
    {
      id: sectionIds.batteries,
      caption: "Store today. Use when needed.",
      title: "Batteries",
      categories: ["batteries"],
      interest: "Batteries",
      note: "Representative model. Internal layout is illustrative.",
      views: [
        { label: "Tubular", kind: "photo", image: { src: batteryPhoto, alt: "Exide Home tubular inverter battery" } },
        { label: "Lithium", kind: "photo", image: { src: lithiumPhoto, alt: "Microtek lithium-ion battery" } },
      ],
    },
    {
      id: sectionIds.electrical,
      caption: "For homes, offices & businesses.",
      title: "Online UPS",
      categories: ["online-ups"],
      interest: "Online UPS",
      note: "Confirm current model, availability and warranty.",
      views: [
        { label: "Online UPS", kind: "photo", image: { src: upsPhoto, alt: "Microtek online UPS in a living room" } },
        {
          label: "Electrical products",
          kind: "photo",
          title: "Electrical products",
          categories: ["electrical-products"],
          interest: "Electrical products",
          image: { src: electricalPhoto, alt: "Microtek wires, switches and electrical protection products" },
        },
      ],
    },
  ] satisfies LineupProduct[],
};

export const customerStories = {
  label: "Our customers.",
  statement: ["Powering everyday", "confidence."],
  note: "Customer stories supplied in the Ishita Traders brochure.",
};

export const applications = {
  label: "Power for every space.",
  statement: "Where your energy works.",
  items: [
    {
      id: sectionIds.residential,
      title: "Residential",
      interest: "Home solar installation",
      image: { src: projectHome, alt: "Rooftop solar on a home, with the installer and owner" },
    },
    {
      id: sectionIds.commercial,
      title: "Commercial",
      interest: "Commercial power systems",
      image: { src: projectCommercial, alt: "Rows of solar panels on a commercial rooftop" },
    },
    {
      id: sectionIds.institutional,
      title: "Institutional",
      interest: "Institutional solar",
      image: { src: projectInstitution, alt: "Solar array on an institutional building" },
    },
  ] satisfies { id: SectionId; title: string; interest: string; image: Picture }[],
};

export const directorWord = {
  label: "A word from our director.",
  quote: "“Quality is not just what we promise — it is what we consistently deliver.”",
  image: { src: teamPhoto, alt: "Ishita Traders technicians installing rooftop solar panels" } satisfies Picture,
};

export const trustedBrands = {
  title: ["Trusted names.", "Local guidance."],
};

export const questions = {
  label: "Questions, answered.",
};

export const contactSection = {
  title: ["Let’s power", "your next step."],
  subtitle: ["Tell us what you want to power.", "Let’s find your next step."],
  /** Choices for "Interested in"; links elsewhere on the page pre-select them (see `data-enquire`). */
  interests: [
    "Solar panels",
    "Home solar installation",
    "Commercial power systems",
    "Institutional solar",
    "Inverters",
    "Batteries",
    "Online UPS",
    "Electrical products",
    "Help choosing a solution",
  ],
  submit: "Continue on WhatsApp",
  note: "Review and send your message in WhatsApp. We keep a copy so our team can call you back.",
};
