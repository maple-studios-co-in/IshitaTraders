import type { StaticImageData } from "next/image";

import exidePhoto from "@/assets/images/pages/brands/exide.webp";
import microtekPhoto from "@/assets/images/pages/brands/microtek.webp";
import utlPhoto from "@/assets/images/pages/brands/utl.webp";
import type { FigmaIconName } from "@/components/pages/figma-icons";

/**
 * Brands page copy (Figma zj4F9WF6L3bOUAsZTbe9xJ, frame 304:4858). `slug` matches the brand's slug in
 * Admin → Brands, so "View … Products" opens that brand's catalogue and `/brands#<slug>` jumps here.
 */

export interface BrandProfile {
  slug: "utl" | "exide" | "microtek";
  name: string;
  legalName: string;
  initial: string;
  badges: [string, string];
  description: string;
  offerings: [string, string, string, string];
  highlights: { icon: FigmaIconName; label: string }[];
  note: string;
  cta: string;
  image: { src: StaticImageData; alt: string };
  caption: { eyebrow: string; title: string };
  /** Which side the photo sits on at desktop widths (the blocks alternate). */
  imageSide: "left" | "right";
}

export const brandProfiles: BrandProfile[] = [
  {
    slug: "utl",
    name: "UTL Solar",
    legalName: "Ubiquitous Technologies Ltd.",
    initial: "U",
    badges: ["Authorized Partner", "India's Preferred Solar Brand"],
    description:
      "UTL is a pioneer in solar energy technology across India, internationally acclaimed for revolutionary rapid-MPPT solar PCUs, Gamma+ hybrid inverters, and high-efficiency DCR and Non-DCR photovoltaic panels specially engineered for residential rooftops, agricultural pumps, and industrial energy independence.",
    offerings: [
      "Gamma+ & Alpha Pro Hybrid PCU",
      "Mono PERC Half-Cut Modules",
      "Grid-Tie String Inverters",
      "r-MPPT Solar Tech (30% More Generation)",
    ],
    highlights: [
      { icon: "utlEfficiency", label: "Up to 98% Tracking Efficiency" },
      { icon: "utlCertified", label: "BIS & MNRE Certified" },
      { icon: "utlWarranty", label: "25-Year Performance Warranty" },
    ],
    note: "Complete range available for immediate delivery & rooftop installation in Chakia & Motihari.",
    cta: "View UTL Products",
    image: { src: utlPhoto, alt: "Ishita Traders rooftop solar array with its control panel" },
    caption: { eyebrow: "Engineering benchmark", title: "Rooftop Solar & Microgrid Solutions" },
    imageSide: "left",
  },
  {
    slug: "exide",
    name: "Exide Industries",
    legalName: "Exide Industries Ltd.",
    initial: "E",
    badges: ["Authorized Channel Dealer", "India's No. 1 Battery Specialist"],
    description:
      "Exide Industries is India’s foremost manufacturer of lead-acid storage batteries and advanced energy backup solutions. Engineered for deep cycle endurance, extreme seasonal temperature tolerance, and ultra-long reserve power across residential, agricultural, and mission-critical commercial establishments.",
    offerings: [
      "InvaTubular IT500+ Series (150Ah - 220Ah)",
      "Tubemaster High-Durability Range",
      "Solar Tubular C10 Deep-Cycle Batteries",
      "Automotive & Tractor Heavy Batteries",
    ],
    highlights: [
      { icon: "exideSpine", label: "Torr Tubular Spine Technology" },
      { icon: "exideMagicEye", label: "Magic Eye Acid Level Indicators" },
      { icon: "exideWarranty", label: "Up to 66 Months Warranty" },
    ],
    note: "Genuine factory fresh inventory with valid barcode digital warranty registration on spot.",
    cta: "View Exide Products",
    image: { src: exidePhoto, alt: "Exide batteries and an inverter on display at a dealer's store" },
    caption: { eyebrow: "Unmatched longevity", title: "Deep-Discharge Resistant Power" },
    imageSide: "right",
  },
  {
    slug: "microtek",
    name: "Microtek",
    legalName: "Microtek International Pvt. Ltd.",
    initial: "M",
    badges: ["Authorized Sales & Service", "Technology We Live In"],
    description:
      "Microtek is an iconic household brand and technology leader in power conditioning and backup solutions across India. Esteemed for pure sine wave UPS systems that protect sensitive appliances, microcontroller-based digital automatic voltage stabilizers, and high-efficiency hybrid solar inverters.",
    offerings: [
      "Smart Pure Sine Wave UPS Series",
      "Automatic Digital Voltage Stabilizers (AC/Fridge)",
      "Solar PCU & MPPT Hybrid Inverters",
      "Heavy-Duty Online & Offline High-KVA UPS",
    ],
    highlights: [
      { icon: "microtekLogic", label: "Micro-Controller Smart Logic" },
      { icon: "microtekSwitching", label: "Zero Transfer Switching Delay" },
      { icon: "microtekService", label: "Pan-India Service Standard" },
    ],
    note: "In-stock models compatible with single & double battery configurations for home and office.",
    cta: "View Microtek Products",
    image: { src: microtekPhoto, alt: "A technician testing Microtek UPS units on a service bench" },
    caption: { eyebrow: "Precision engineering", title: "Pure Grid Quality Sine Wave Backup" },
    imageSide: "left",
  },
];

export const brandsIntro = {
  badge: "Authorized channel partner & distributor",
  note: "Direct OEM Supply Network",
  title: { lead: "Trusted Global & National Brands", accent: "Under One Roof" },
  description:
    "Ishita Traders is an authorized sales, distribution, and service partner for premier industry leaders in solar rooftop technology, heavy-duty battery energy storage, and pure sine wave power backup systems across Bihar.",
  features: [
    { icon: "directSupply", title: "Direct Supply", detail: "Zero Middlemen Markups" },
    { icon: "genuineBadge", title: "100% Genuine", detail: "OEM Factory Warranty" },
    { icon: "onsiteService", title: "On-Site Service", detail: "Doorstep Engineering" },
    { icon: "certifiedTeam", title: "Certified Team", detail: "Brand-Trained Staff" },
  ] satisfies { icon: FigmaIconName; title: string; detail: string }[],
};

export const whyBuyDirect = {
  eyebrow: "The authorized advantage",
  title: "Why Buy Directly from Ishita Traders?",
  description:
    "When dealing with high-capacity electrical storage and rooftop solar arrays, authentic supply and trained installation make the difference between reliability and early failure.",
  cards: [
    {
      icon: "whyGenuine",
      tint: "bg-[rgb(0_61_155/0.1)]",
      title: "100% Genuine Guaranteed",
      text: "Every unit comes straight from official OEM factory distribution lines. Never refurbished, zero grey-market units. Complete with authentic serial number verification and valid factory warranties.",
      tagIcon: "checkNavy",
      tag: "Serial Tracking Enabled",
      tagColor: "text-[#003d9b]",
    },
    {
      icon: "whyPricing",
      tint: "bg-[rgb(0_108_74/0.1)]",
      title: "Transparent Pricing & Subsidies",
      text: "Direct factory pricing with comprehensive documentation for the PM Surya Ghar Muft Bijli Yojana rooftop solar subsidy and MSME solar financing options in Bihar.",
      tagIcon: "checkBlue",
      tag: "Govt Subsidy Documentation",
      tagColor: "text-[#0052cc]",
    },
    {
      icon: "whyLocal",
      tint: "bg-[rgb(83_90_112/0.1)]",
      title: "Local Installation & Service",
      text: "Based centrally in Chakia, East Champaran. Our dedicated, brand-certified technicians deliver prompt doorstep installation, battery acid checks, and swift warranty servicing.",
      tagIcon: "checkBlue",
      tag: "Chakia Service Hub",
      tagColor: "text-[#0052cc]",
    },
  ] satisfies {
    icon: FigmaIconName;
    tint: string;
    title: string;
    text: string;
    tagIcon: FigmaIconName;
    tag: string;
    tagColor: string;
  }[],
};
