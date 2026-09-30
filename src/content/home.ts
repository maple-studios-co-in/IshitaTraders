import type { StaticImageData } from "next/image";

import heroImage from "@/assets/images/hero/solar-farm.webp";
import brandExide from "@/assets/images/brands/exide.webp";
import brandUtl from "@/assets/images/brands/utl.webp";
import brandMicrotek from "@/assets/images/brands/microtek.webp";
import categorySolarPanels from "@/assets/images/categories/solar-panels.webp";
import categorySolarInverters from "@/assets/images/categories/solar-inverters.webp";
import categoryInverters from "@/assets/images/categories/inverters.webp";
import categoryBatteries from "@/assets/images/categories/batteries.webp";
import categoryOnlineUps from "@/assets/images/categories/online-ups.webp";
import categoryElectrical from "@/assets/images/categories/electrical.webp";
import aboutCollage1 from "@/assets/images/about/collage-1.webp";
import aboutCollage2 from "@/assets/images/about/collage-2.webp";
import aboutCollage3 from "@/assets/images/about/collage-3.webp";
import aboutCollage4 from "@/assets/images/about/collage-4.webp";
import featuredUtl from "@/assets/images/products/featured-utl.webp";
import featuredExide from "@/assets/images/products/featured-exide.webp";
import featuredMicrotek from "@/assets/images/products/featured-microtek.webp";
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
import avatarMamta from "@/assets/images/testimonials/mamta-verma.webp";
import avatarAjay from "@/assets/images/testimonials/ajay-kumar-singh.webp";
import avatarAlok from "@/assets/images/testimonials/alok-kumar-verma.webp";

import { anchor, productLinks, sectionIds } from "@/config/navigation";
import { enquiryHref, whatsappHref } from "@/lib/contact-links";

export interface ImageAsset {
  src: StaticImageData;
  alt: string;
}

/* ------------------------------------------------------------------ Hero */

export const hero = {
  eyebrow: "Ishita Traders",
  established: "Estd. 2014",
  titleLines: ["Reliable Power.", "Smarter Solar."],
  description:
    "Solar • Inverters • Batteries • Electrical Solutions. Trusted products and power solutions for homes, businesses and institutions.",
  trustedBrandsLabel: "Trusted Brands:",
  trustedBrands: ["UTL", "EXIDE", "MICROTEK"],
  image: {
    src: heroImage,
    alt: "Rows of solar panels installed across a village landscape in Bihar",
  } satisfies ImageAsset,
  helpLine: {
    question: "Need help choosing the right product?",
    label: "Call our Chakia technical desk:",
  },
};

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
      cta: { label: "View Exide Products", href: productLinks.all },
    },
    {
      name: "UTL Solar",
      image: { src: brandUtl, alt: "UTL Solar logo" },
      features: [
        { icon: "sun", label: "Solar Inverters" },
        { icon: "home", label: "Home Inverters" },
        { icon: "cog", label: "Solar Solutions" },
      ],
      cta: { label: "View UTL Products", href: productLinks.all },
    },
    {
      name: "Microtek",
      image: { src: brandMicrotek, alt: "Microtek Solar Solutions logo" },
      features: [
        { icon: "bolt", label: "Inverters" },
        { icon: "home", label: "UPS" },
        { icon: "sun", label: "Solar" },
      ],
      cta: { label: "View Microtek Products", href: productLinks.all },
    },
  ] satisfies BrandPartner[],
};

/* --------------------------------------------------------- What we provide */

export interface ProductCategory {
  category: string;
  title: string;
  description: string;
  image: ImageAsset;
  href: string;
}

export const inventorySection = {
  eyebrow: "Complete inventory",
  title: "What We Provide",
  lead: "Power solutions for homes, businesses, and institutions across North Bihar.",
  viewAll: { label: "View All Products", href: productLinks.featured },
  ctaLabel: "Get Price & Availability",
  categories: [
    {
      category: "Rooftop & Project",
      title: "Solar Panels",
      description:
        "High-efficiency UTL solar modules for residential and commercial projects, designed for reliable long-term power generation.",
      image: { src: categorySolarPanels, alt: "Two solar panels mounted on a sunny rooftop" },
      href: enquiryHref("solar panels"),
    },
    {
      category: "Smart Solar PCU",
      title: "Solar Inverters",
      description:
        "UTL on-grid solar inverters with MPPT technology for efficient solar conversion and dependable grid-connected performance.",
      image: { src: categorySolarInverters, alt: "UTL solar inverter mounted on a wall" },
      href: enquiryHref("solar inverters"),
    },
    {
      category: "Home & Office UPS",
      title: "Inverters",
      description:
        "Exide PowerSafe batteries designed for reliable backup power in offices, businesses and critical power applications.",
      image: { src: categoryInverters, alt: "Exide PowerSafe Plus batteries" },
      href: enquiryHref("inverters and PowerSafe batteries"),
    },
    {
      category: "Inverter Batteries",
      title: "Batteries",
      description:
        "Exide tubular batteries built for home backup and inverter applications, delivering dependable performance and long backup life.",
      image: { src: categoryBatteries, alt: "Exide Home tubular inverter battery" },
      href: enquiryHref("inverter batteries"),
    },
    {
      category: "Commercial & Critical",
      title: "Online UPS",
      description:
        "Microtek UPS solutions designed for stable, uninterrupted power for homes, offices and sensitive electronic equipment.",
      image: { src: categoryOnlineUps, alt: "Family at home next to a Microtek online UPS" },
      href: enquiryHref("online UPS systems"),
    },
    {
      category: "Appliances & Wiring",
      title: "Electrical Products",
      description:
        "Microtek electrical protection solutions including MCBs, protection devices and accessories for safer power systems.",
      image: { src: categoryElectrical, alt: "Microtek MCBs, wiring and electrical accessories" },
      href: enquiryHref("electrical products"),
    },
  ] satisfies ProductCategory[],
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

export interface FeaturedProduct {
  brand: string;
  name: string;
  description: string;
  image: ImageAsset;
  cta: { label: string; href: string };
}

export const featuredSection = {
  eyebrow: "Products",
  title: "Featured Products",
  lead: "Genuine factory-fresh stock with original manufacturer warranty.",
  viewAll: { label: "View All Products", href: productLinks.all },
  products: [
    {
      brand: "UTL",
      name: "Lithium-Ion Battery",
      description: "High-efficiency LiFePO4 battery, long-lasting power.",
      image: { src: featuredUtl, alt: "UTL lithium-ion battery with display" },
      cta: { label: "View UTL Products", href: productLinks.all },
    },
    {
      brand: "Exide",
      name: "Tubular Inverter Batteries",
      description: "Exide HUPS can be customized to suit your needs and budget, choose the right HUPS for you.",
      image: { src: featuredExide, alt: "Exide Home tubular inverter battery" },
      cta: { label: "View Exide Products", href: productLinks.all },
    },
    {
      brand: "Microtek",
      name: "Lithium Iron Phosphate",
      description: "Power that never fades — lithium ion.",
      image: { src: featuredMicrotek, alt: "Microtek lithium-ion LFP battery" },
      cta: { label: "View Microtek Products", href: productLinks.all },
    },
  ] satisfies FeaturedProduct[],
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
    href: whatsappHref(
      "Hi Ishita Traders, I would like to talk to a solar expert about rooftop solar for my home under PM Surya Ghar Muft Bijli Yojana.",
    ),
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
      pill: { label: "UTL • Exide • Microtek", href: anchor(sectionIds.brands) },
    },
    {
      number: "02",
      title: "Since 2014",
      description:
        "A decade of continuous service across Bihar, ensuring accessible local support wherever you need it most.",
      pill: { label: "Serving All of Bihar", href: anchor(sectionIds.contact) },
    },
    {
      number: "03",
      title: "Bulk Supply",
      description:
        "Wholesale pricing, commercial battery banks, and turnkey solar solutions are directly supplied to hospitals, colleges, businesses, factories, petrol pumps, clinics, retail shops, schools, and MSME units such as flour mills, oil mills, and other small- and medium-scale industrial businesses.",
      pill: {
        label: "B2B & Institutional Rates",
        href: whatsappHref("Hi Ishita Traders, I would like B2B / institutional rates for a bulk requirement."),
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
  cta: { label: string; href: string };
}

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
    cta: { label: "Explore Solar Panels", href: enquiryHref("solar panels") },
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
    cta: { label: "Explore Inverters", href: enquiryHref("solar inverters") },
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
    cta: { label: "Explore Batteries", href: enquiryHref("solar batteries") },
  },
];

/* ---------------------------------------------------------- Testimonials */

export type TestimonialBadge = "installation" | "commercial" | "healthcare";

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  rating: number;
  badge: { kind: TestimonialBadge; label: string };
  avatar: ImageAsset;
}

export const testimonialsSection = {
  eyebrow: "Testimonials",
  title: "What Our Clients Say",
  lead: "Real feedback from homes, businesses and institutions we power across Bihar.",
  items: [
    {
      name: "Mamta Verma",
      location: "Chakia, East Champaran • Homeowner",
      quote:
        "Installed a 5kW UTL on-grid solar system with Ishita Traders last summer. Our monthly electricity bill dropped from ₹6,200 to barely ₹450 during peak heat. Their Chakia installation team did clean wiring and took care of all the net-metering paperwork seamlessly.",
      rating: 5,
      badge: { kind: "installation", label: "Verified Installation" },
      avatar: { src: avatarMamta, alt: "Mamta Verma" },
    },
    {
      name: "Ajay Kumar Singh",
      location: "Raghunath Pur, East Champaran, Bihar • Petrol Pump",
      quote:
        "We operate our petrol dispensing units and cold drink refrigerators entirely on the solar inverter solution purchased from Ishita Traders. The diesel generator cost savings alone paid back half our solar investment in the first 8 months.",
      rating: 5,
      badge: { kind: "commercial", label: "Verified Commercial" },
      avatar: { src: avatarAjay, alt: "Ajay Kumar Singh" },
    },
    {
      name: "Dr. Alok Kumar Verma",
      location: "Motihari, Bihar • Verma Diagnostic Clinic",
      quote:
        "Running sensitive ultrasound and haematology machines requires zero voltage dips. Ishita Traders recommended and set up a Microtek 10kVA Online UPS with heavy Exide tubular batteries. In 18 months, we haven't faced a single minute of machine downtime. Exemplary local after-sales service!",
      rating: 5,
      badge: { kind: "healthcare", label: "Verified Healthcare Buyer" },
      avatar: { src: avatarAlok, alt: "Dr. Alok Kumar Verma" },
    },
  ] satisfies Testimonial[],
};

/* -------------------------------------------------------------- Director */

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
  signature: "— Director, Mr. Amit Kumar",
  portrait: { src: directorPortrait, alt: "Mr. Amit Kumar, Director of Ishita Traders" } satisfies ImageAsset,
  location: "Chakia, East Champaran, Bihar",
};

/* ------------------------------------------------------------------- FAQ */

export const faqSection = {
  eyebrow: "Have questions?",
  title: "FAQ",
  lead: "Get quick answers from our team and expert guidance for your solar needs.",
  questions: [
    "What is the estimated budget required for installing a solar project?",
    "What is the warranty period for the solar panels?",
    "Which areas do you provide services in, and which solar brands do you install?",
    "Where is your office located, and do you charge for home visits?",
  ],
};

/* ------------------------------------------------------------- Final CTA */

export const finalCta = {
  title: "Ready to Power Your Future?",
  description:
    "Explore solar panels, inverters, batteries and complete energy solutions from trusted UTL, Microtek, Exide product ranges.",
  quote: { label: "Get a Quote", href: anchor(sectionIds.contact) },
  whatsapp: { label: "WhatsApp Us", href: whatsappHref() },
};

export const footerContent = {
  tagline: "Battery | Inverter | Solar",
  description:
    "Distributor and turnkey power solutions provider, serving primarily Champaran and across Bihar since 2014.",
  copyright: "© Ishita Traders. All Rights Reserved. Estd. 2014, Chakia, East Champaran, Bihar.",
};
