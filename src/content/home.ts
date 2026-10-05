import type { StaticImageData } from "next/image";

import brandExide from "@/assets/images/brands/exide.webp";
import brandUtl from "@/assets/images/brands/utl.webp";
import brandMicrotek from "@/assets/images/brands/microtek.webp";
import aboutCollage1 from "@/assets/images/about/collage-1.webp";
import aboutCollage2 from "@/assets/images/about/collage-2.webp";
import aboutCollage3 from "@/assets/images/about/collage-3.webp";
import aboutCollage4 from "@/assets/images/about/collage-4.webp";
import institutionalInstallation from "@/assets/images/solutions/institutional-installation.webp";
import rooftopSunrise from "@/assets/images/solutions/rooftop-sunrise.webp";
import whyBackground from "@/assets/images/why/solar-field.webp";
import installationHome from "@/assets/images/installations/home.webp";
import installationCommercial from "@/assets/images/installations/commercial.webp";
import installationInstitution from "@/assets/images/installations/institution.webp";
import showcasePanels from "@/assets/images/showcase/solar-panels.webp";
import showcaseInverter from "@/assets/images/showcase/solar-inverter.webp";
import showcaseBattery from "@/assets/images/showcase/tubular-battery.webp";
import directorPortrait from "@/assets/images/team/amit-kumar.webp";

import type { LinkTarget } from "@/admin/content/links";
import { anchor, productLinks, sectionIds } from "@/config/navigation";

/**
 * Static copy for the homepage sections. Business facts, contact channels, the hero, product
 * categories, featured products, testimonials and FAQs are managed in the admin instead
 * (see src/admin/content). Links to WhatsApp/enquiries are intents resolved from the current
 * contact settings at render time.
 */

export interface ImageAsset {
  src: StaticImageData;
  alt: string;
}

/* ---------------------------------------------------------------- Brands */

export type FeatureIcon = "bolt" | "home" | "sun" | "cog";

export interface BrandPartner {
  name: string;
  image: ImageAsset;
  features: { icon: FeatureIcon; label: string }[];
  cta: { label: string; href: string };
}

export const brandsSection = {
  eyebrow: "Certified dealerships",
  title: "Trusted Brands. Reliable Power.",
  lead: "We are proud to be authorized distributors of leading brands.",
  brands: [
    {
      name: "Exide",
      image: { src: brandExide, alt: "Exide logo" },
      features: [
        { icon: "bolt", label: "Inverters" },
        { icon: "home", label: "UPS" },
        { icon: "sun", label: "Solar" },
      ],
      cta: { label: "View Exide Products", href: productLinks.brand("exide") },
    },
    {
      name: "UTL Solar",
      image: { src: brandUtl, alt: "UTL Solar logo" },
      features: [
        { icon: "sun", label: "Solar Inverters" },
        { icon: "home", label: "Home Inverters" },
        { icon: "cog", label: "Solar Solutions" },
      ],
      cta: { label: "View UTL Products", href: productLinks.brand("utl") },
    },
    {
      name: "Microtek",
      image: { src: brandMicrotek, alt: "Microtek Solar Solutions logo" },
      features: [
        { icon: "bolt", label: "Inverters" },
        { icon: "home", label: "UPS" },
        { icon: "sun", label: "Solar" },
      ],
      cta: { label: "View Microtek Products", href: productLinks.brand("microtek") },
    },
  ] satisfies BrandPartner[],
};

/* --------------------------------------------------------- What we provide */

/** Section copy; the category cards come from Admin → Brands & categories. */
export const inventorySection = {
  eyebrow: "Complete inventory",
  title: "What We Provide",
  lead: "Power solutions for homes, businesses, and institutions across North Bihar.",
  viewAll: { label: "View All Products", href: productLinks.all },
  ctaLabel: "Get Price & Availability",
};

/* ----------------------------------------------------------------- About */

export const aboutSection = {
  eyebrow: "About Ishita Traders",
  watermark: ["Ishita", "Traders"],
  established: "Established in 2014",
  title: "Reliable Power. Smarter Solutions.",
  paragraphs: [
    "Established in 2014, Ishita Traders is a trusted supplier of electrical and power solutions, headquartered in Chakia, East Champaran, Bihar.",
    "We specialize in a wide range of solar and electrical products, including solar panels, inverters, batteries, UPS systems, air conditioners, televisions, and electrical accessories, serving homes, businesses, institutions, and government organizations.",
    "We are authorized distributors of leading brands including UTL, Exide, and Microtek, providing genuine products and dependable solutions for residential, commercial, and institutional requirements.",
    "With our experience in the power and electrical sector, Ishita Traders continues to serve customers across India with a focus on reliable products and practical power solutions.",
  ],
  learnMore: { label: "Learn more", href: anchor(sectionIds.director) },
  gallery: {
    // Two staggered columns, heights follow the Figma collage.
    left: [
      { src: aboutCollage1, alt: "Microtek inverters, batteries and solar panels on display" },
      { src: aboutCollage2, alt: "Installation team fitting solar panels on a rooftop" },
    ],
    right: [
      { src: aboutCollage4, alt: "Happy customer standing in front of a rooftop solar system" },
      { src: aboutCollage3, alt: "Range of UTL solar inverters, batteries and panels" },
    ],
  },
};

/* ------------------------------------------------------ Featured products */

/** Section copy; the products are the ones marked "Featured" in Admin → Products. */
export const featuredSection = {
  eyebrow: "Products",
  title: "Featured Products",
  lead: "Genuine factory-fresh stock with original manufacturer warranty.",
  viewAll: { label: "View All Products", href: productLinks.all },
};

/* --------------------------------------------------------------- Contact */

export const contactSection = {
  tag: "Contact us",
  title: { lead: "Let’s Build a", highlight: ["Brighter", "Future"], trail: "Together" },
  infoTitle: "Contact Information",
  quickLinksTitle: "Quick links",
  quickLinks: [
    { label: "Home", href: anchor(sectionIds.home) },
    { label: "About", href: anchor(sectionIds.about) },
    { label: "Services", href: anchor(sectionIds.products) },
  ],
};

/* ----------------------------------------------------------- Solar (EPC) */

export type BenefitIcon = "sun" | "plug" | "trend";

export const solarSection = {
  eyebrow: "Turnkey EPC & Delivery",
  title: "Power Your Future with Solar",
  lead: "Clean, reliable and practical solar solutions engineered specifically for homes, petrol pumps, schools, and commercial enterprises across Bihar.",
  image: {
    src: institutionalInstallation,
    alt: "Rooftop solar installation on an institutional building in a Bihar village",
  } satisfies ImageAsset,
  badge: "Institutional Installation",
  benefits: [
    {
      icon: "sun",
      title: "Clean Energy",
      description: "Harness the power of sunlight to generate self-sustaining, pollution-free electricity year-round.",
    },
    {
      icon: "plug",
      title: "Reliable Power",
      description:
        "Solutions designed around your actual peak load demands, ensuring zero business interruption during grid cuts.",
    },
    {
      icon: "trend",
      title: "Long-Term Savings",
      description:
        "Substantially reduce dependence on diesel generators and unpredictable monthly grid utility electricity tariffs.",
    },
  ] satisfies { icon: BenefitIcon; title: string; description: string }[],
  primaryCta: { label: "Explore Solar Solutions", href: anchor(sectionIds.solarRange) },
  secondaryCta: { label: "Talk to Us", href: anchor(sectionIds.contact) },
};

export const solarHomeBanner = {
  title: "Explore Solar Solutions for Your Home",
  description:
    "Talk to Ishita Traders about rooftop solar requirements for your residence. We are an authorised vendor facilitating installation and net-metering liaison under the central PM Surya Ghar Muft Bijli Yojana.",
  cta: {
    label: "Talk to a Solar Expert",
    href: {
      kind: "whatsapp",
      message:
        "Hi Ishita Traders, I would like to talk to a solar expert about rooftop solar for my home under PM Surya Ghar Muft Bijli Yojana.",
    } as LinkTarget,
  },
};

/* ---------------------------------------------------------------- Why us */

export const whyUsSection = {
  eyebrow: "Our foundation",
  title: "Why Choose Ishita Traders?",
  lead: "A track record built on genuine products, local availability, transparent paperwork, and direct service assistance.",
  background: { src: whyBackground, alt: "" } satisfies ImageAsset,
  reasons: [
    {
      number: "01",
      title: "Trusted Brands",
      description:
        "Authorized direct distribution partnerships with UTL, Exide, and Microtek. 100% factory-sealed stock with verifiable manufacturer warranties.",
      pill: { label: "UTL • Exide • Microtek", href: anchor(sectionIds.brands) as LinkTarget },
    },
    {
      number: "02",
      title: "Since 2014",
      description:
        "A decade of continuous service across Bihar, ensuring accessible local support wherever you need it most.",
      pill: { label: "Serving All of Bihar", href: anchor(sectionIds.contact) as LinkTarget },
    },
    {
      number: "03",
      title: "Bulk Supply",
      description:
        "Wholesale pricing, commercial battery banks, and turnkey solar solutions are directly supplied to hospitals, colleges, businesses, factories, petrol pumps, clinics, retail shops, schools, and MSME units such as flour mills, oil mills, and other small- and medium-scale industrial businesses.",
      pill: {
        label: "B2B & Institutional Rates",
        href: {
          kind: "whatsapp",
          message: "Hi Ishita Traders, I would like B2B / institutional rates for a bulk requirement.",
        } as LinkTarget,
      },
    },
  ],
};

/* --------------------------------------------------------- Installations */

export const installationsSection = {
  title: "Built Around Better Energy Decisions",
  lead: "Real installations across homes, commercial shops, and institutions in North Bihar.",
  items: [
    {
      tag: "Residential Rooftop",
      title: "Home Solar Solutions",
      description:
        "Custom-engineered rooftop arrays that integrate with home inverters to keep essential home loads powered through day and night.",
      image: { src: installationHome, alt: "Homeowner and installer on a rooftop with solar panels" },
    },
    {
      tag: "Retail & Petrol Pumps",
      title: "Commercial Power Systems",
      description:
        "Heavy-duty UTL and Microtek inverters with high-capacity tubular batteries to eliminate generator diesel expenses for retail shops.",
      image: { src: installationCommercial, alt: "Shop owner beside an inverter and battery bank outside his store" },
    },
    {
      tag: "Health Centers & Schools",
      title: "Institutional Solar Grids",
      description:
        "Large scale solar systems installed on rural hospital terraces and educational institutions under verified technical standards.",
      image: { src: installationInstitution, alt: "Solar array on the terrace of a rural health centre" },
    },
  ] satisfies { tag: string; title: string; description: string; image: ImageAsset }[],
};

/* ---------------------------------------------------- Sunlight → power */

export type EnergyFeatureIcon = "leaf" | "rupee" | "gear" | "sprout";

export const sunlightSection = {
  eyebrow: "Renewable energy",
  titleLines: ["From Sunlight", "to Electricity"],
  description:
    "Harness the power of the sun with reliable solar solutions for homes, businesses, and institutions. Clean energy today for a brighter tomorrow.",
  features: [
    { icon: "leaf", label: ["Clean &", "Green Energy"] },
    { icon: "rupee", label: ["Lower", "Electricity Bills"] },
    { icon: "gear", label: ["Reliable", "Performance"] },
    { icon: "sprout", label: ["Sustainable", "Future"] },
  ] satisfies { icon: EnergyFeatureIcon; label: [string, string] }[],
  cta: { label: "Explore Solar Products", href: anchor(sectionIds.solarRange) },
  image: {
    src: rooftopSunrise,
    alt: "Modern home with rooftop solar panels catching the morning sun",
  } satisfies ImageAsset,
  videoLabel: "Watch the solar system video tour",
};

/* ------------------------------------------------------- Product showcase */

export interface ShowcaseSlide {
  category: string;
  title: string[];
  tagline: [string, string];
  description: string;
  points: string[];
  headline: string[];
  image: ImageAsset;
  cta: { label: string; href: LinkTarget };
}

/** A slide whose CTA has been resolved to a URL (what the client component receives). */
export type ResolvedShowcaseSlide = Omit<ShowcaseSlide, "cta"> & { cta: { label: string; href: string } };

export const showcaseSlides: ShowcaseSlide[] = [
  {
    category: "Solar Solutions",
    title: ["Solar", "Panels"],
    tagline: ["Capture today.", "Power tomorrow."],
    description:
      "High-efficiency solar panels that harness clean, renewable energy to reduce electricity costs and build a sustainable future.",
    points: ["Clean & Renewable Energy", "High Efficiency", "Long-Lasting Performance"],
    headline: ["Turn sunlight", "into power"],
    image: { src: showcasePanels, alt: "Two monocrystalline solar panels catching sunlight" },
    cta: { label: "Explore Solar Panels", href: { kind: "enquiry", subject: "solar panels" } },
  },
  {
    category: "Power Backup",
    title: ["Inverters"],
    tagline: ["Reliable power.", "For a brighter life."],
    description:
      "Advanced inverters that convert solar energy into usable power, ensuring uninterrupted electricity for your home and business.",
    points: ["Stable & Efficient Power", "Smart Monitoring", "Durable & Low Maintenance"],
    headline: ["Converting", "energy into", "opportunities"],
    image: { src: showcaseInverter, alt: "UTL solar inverter with digital display" },
    cta: { label: "Explore Inverters", href: { kind: "enquiry", subject: "solar inverters" } },
  },
  {
    category: "Energy Storage",
    title: ["Batteries"],
    tagline: ["Store today.", "Use anytime."],
    description:
      "High-performance batteries designed for longer backup, faster charging and reliable power whenever you need it.",
    points: ["Longer Backup", "Fast Charging", "Safe & Reliable"],
    headline: ["Store energy", "for a brighter", "tomorrow"],
    image: { src: showcaseBattery, alt: "Exide solar tubular battery" },
    cta: { label: "Explore Batteries", href: { kind: "enquiry", subject: "solar batteries" } },
  },
];

/* ---------------------------------------------------------- Testimonials */

/** Section copy; the reviews come from Admin → Testimonials. */
export const testimonialsSection = {
  eyebrow: "Testimonials",
  title: "What Our Clients Say",
  lead: "Real feedback from homes, businesses and institutions we power across Bihar.",
};

/* -------------------------------------------------------------- Director */

/** The director's name and title come from Admin → Site content → Business. */
export const directorSection = {
  eyebrow: "Director’s message",
  quote: "“Quality is not just what we promise — it is what we consistently deliver.”",
  paragraphs: [
    "At Ishita Traders, we believe that quality builds trust, and trust builds lasting relationships. Our commitment is simple: to provide our customers with reliable, high-quality products and services that they can depend on.",
    "We never compromise when it comes to Quality, Reliability, and Customer Satisfaction. Every product we offer is carefully selected with the same standard of excellence that we would expect for ourselves.",
    "For us, Time and Quality both matter. We value our customers’ time and are committed to delivering our products and services with professionalism, transparency, and timely execution.",
  ],
  principle: {
    title: "Our journey is built on one principle:",
    points: ["Never compromise on quality.", "Never take our customers’ trust for granted."],
  },
  portrait: directorPortrait,
  location: "Chakia, East Champaran, Bihar",
};

/* ------------------------------------------------------------------- FAQ */

/** Section copy; the questions come from Admin → FAQs. */
export const faqSection = {
  eyebrow: "Have questions?",
  title: "FAQ",
  lead: "Get quick answers from our team and expert guidance for your solar needs.",
};

/* ------------------------------------------------------------- Final CTA */

export const finalCta = {
  title: "Ready to Power Your Future?",
  description:
    "Explore solar panels, inverters, batteries and complete energy solutions from trusted UTL, Microtek, Exide product ranges.",
  quote: { label: "Get a Quote", href: anchor(sectionIds.contact) },
  whatsapp: { label: "WhatsApp Us", href: { kind: "whatsapp" } as LinkTarget },
};
