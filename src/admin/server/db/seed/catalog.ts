import { staticImage, type StaticImageKey } from "@/admin/content/images";
import type { ProductSpec, StockStatus } from "@/admin/content/types";

/**
 * Starting catalogue: the three dealerships, the six homepage categories and the products from
 * the Figma product page (224:7144) and product popup (219:2312), plus the homepage's featured
 * products. Prices are left empty on purpose — the owner sets real dealer prices in the admin.
 */

export const seedBrands = [
  { slug: "exide", name: "Exide", tabLabel: "EXIDE Catalogue", logo: staticImage("brands/exide", "Exide logo") },
  {
    slug: "utl",
    name: "UTL Solar",
    tabLabel: "UTL Solar Catalogue",
    logo: staticImage("brands/utl", "UTL Solar logo"),
  },
  {
    slug: "microtek",
    name: "Microtek",
    tabLabel: "MICROTEK Catalogue",
    logo: staticImage("brands/microtek", "Microtek Solar Solutions logo"),
  },
] as const;

export type SeedBrandSlug = (typeof seedBrands)[number]["slug"];

export const seedCategories = [
  {
    slug: "solar-panels",
    name: "Solar Panels",
    label: "Rooftop & Project",
    description:
      "High-efficiency UTL solar modules for residential and commercial projects, designed for reliable long-term power generation.",
    image: staticImage("categories/solar-panels", "Two solar panels mounted on a sunny rooftop"),
    enquirySubject: "solar panels",
  },
  {
    slug: "solar-inverters",
    name: "Solar Inverters",
    label: "Smart Solar PCU",
    description:
      "UTL on-grid solar inverters with MPPT technology for efficient solar conversion and dependable grid-connected performance.",
    image: staticImage("categories/solar-inverters", "UTL solar inverter mounted on a wall"),
    enquirySubject: "solar inverters",
  },
  {
    slug: "inverters",
    name: "Inverters",
    label: "Home & Office UPS",
    description:
      "Exide PowerSafe batteries designed for reliable backup power in offices, businesses and critical power applications.",
    image: staticImage("categories/inverters", "Exide PowerSafe Plus batteries"),
    enquirySubject: "inverters and PowerSafe batteries",
  },
  {
    slug: "batteries",
    name: "Batteries",
    label: "Inverter Batteries",
    description:
      "Exide tubular batteries built for home backup and inverter applications, delivering dependable performance and long backup life.",
    image: staticImage("categories/batteries", "Exide Home tubular inverter battery"),
    enquirySubject: "inverter batteries",
  },
  {
    slug: "online-ups",
    name: "Online UPS",
    label: "Commercial & Critical",
    description:
      "Microtek UPS solutions designed for stable, uninterrupted power for homes, offices and sensitive electronic equipment.",
    image: staticImage("categories/online-ups", "Family at home next to a Microtek online UPS"),
    enquirySubject: "online UPS systems",
  },
  {
    slug: "electrical-products",
    name: "Electrical Products",
    label: "Appliances & Wiring",
    description:
      "Microtek electrical protection solutions including MCBs, protection devices and accessories for safer power systems.",
    image: staticImage("categories/electrical", "Microtek MCBs, wiring and electrical accessories"),
    enquirySubject: "electrical products",
  },
] as const;

export type SeedCategorySlug = (typeof seedCategories)[number]["slug"];

interface SeedProduct {
  slug: string;
  sku: string;
  name: string;
  brand: SeedBrandSlug;
  category: SeedCategorySlug;
  typeLabel: string;
  subtitle: string;
  badge: string;
  summary: string;
  description: string;
  image: { key: StaticImageKey; alt: string };
  specs: ProductSpec[];
  applications: string[];
  warranty: string;
  stockStatus?: StockStatus;
  featured?: boolean;
}

/** Card specs (first four) are highlighted; extra rows only appear in the details view. */
const specs = (highlighted: [string, string][], more: [string, string][] = []): ProductSpec[] => [
  ...highlighted.map(([label, value]) => ({ label, value, highlight: true })),
  ...more.map(([label, value]) => ({ label, value, highlight: false })),
];

export const seedProducts: SeedProduct[] = [
  {
    slug: "exide-invatubular-it500-150ah",
    sku: "EX-IT500-150",
    name: "Exide InvaTubular IT500 Heavy Duty Tubular Battery 150Ah",
    brand: "exide",
    category: "batteries",
    typeLabel: "Exide Lead-Acid Batteries",
    subtitle: "Model: IT500 | C20 Rating",
    badge: "66 Months Warranty",
    summary: "Flagship tall tubular battery for long, frequent power cuts.",
    description:
      "Flagship tall tubular lead-acid deep cycle battery engineered with robust spine casting to endure frequent and prolonged power outages with minimal water topping requirements.",
    image: { key: "products/catalog/exide-it500", alt: "Exide InvaTubular IT500 tall tubular battery" },
    specs: specs(
      [
        ["Rated Nominal Capacity", "150Ah @ C20 Rating to 10.5V"],
        ["Voltage Rating", "12V DC Nominal"],
        ["Cycle Life Expectancy", "1200+ Cycles at 80% Depth of Discharge"],
        ["Warranty Framework", "66 Months (36 Months Free Replacement + 30 Pro-Rata)"],
      ],
      [
        ["Spine Grid Casting", "High-Pressure Die-Casting (HDC) HADI Tech"],
        ["Electrolyte Volume", "18.2 Litres Approx."],
        ["Electrolyte Indicators", "Ceramic Vent Plugs with Level Floats"],
        ["Casing Construction", "Impact-Resistant Polypropylene Copolymer"],
        ["Operating Temperature", "-10°C to +55°C Industrial Range"],
      ],
    ),
    applications: ["Home", "Commercial"],
    warranty: "66 Months (36 Months Free Replacement + 30 Pro-Rata)",
  },
  {
    slug: "exide-invamaster-200ah",
    sku: "EX-IMTT2000",
    name: "Exide InvaMaster (200Ah)",
    brand: "exide",
    category: "batteries",
    typeLabel: "Heavy Commercial Tubular",
    subtitle: "Model: IMTT2000 | Heavy Duty Spine",
    badge: "60 Months Warranty",
    summary: "Heavy-duty tall tubular battery for offices, labs and clinics.",
    description:
      "Heavy commercial tall tubular battery with a heavy-duty spine for long backup in offices, laboratories and clinics.",
    image: { key: "products/catalog/exide-invamaster", alt: "Exide InvaMaster tall tubular battery" },
    specs: specs([
      ["Suitable For", "Offices, Labs, Clinics"],
      ["Backup Time", "6-8 Hours Heavy"],
      ["Alloy Type", "Selenium-Low Antimony"],
      ["Availability", "In Stock Chakia"],
    ]),
    applications: ["Commercial", "Institutional"],
    warranty: "60 Months",
  },
  {
    slug: "exide-solar-tubelite-c10-150ah",
    sku: "EX-6LMS150L",
    name: "Exide Solar Tubelite C10 (150Ah)",
    brand: "exide",
    category: "batteries",
    typeLabel: "Solar Deep Cycle C10",
    subtitle: "Model: 6LMS150L | 1500+ Cycles at 80% DOD",
    badge: "MNRE Compliant",
    summary: "C10 solar tubular battery for rooftop and hybrid systems.",
    description:
      "MNRE-compliant C10 solar tubular battery for rooftop and hybrid solar systems, ready for PM Surya Ghar installations.",
    image: { key: "products/catalog/exide-invamaster", alt: "Exide Solar Tubelite C10 battery" },
    specs: specs([
      ["Application", "Rooftop & Hybrid Solar"],
      ["Discharge Rate", "C10 Certified"],
      ["Warranty", "5 Years Full"],
      ["Subsidy Desk", "PM Surya Ghar Ready"],
    ]),
    applications: ["Solar", "Home"],
    warranty: "5 Years Full",
  },
  {
    slug: "exide-integra-pure-sinewave-ups",
    sku: "EX-INTEGRA",
    name: "Exide Integra Pure Sinewave UPS",
    brand: "exide",
    category: "inverters",
    typeLabel: "Wall Mount Li-ion Solution",
    subtitle: "Model: Integra 700 / 1000 | Zero Maintenance",
    badge: "Lithium Inbuilt",
    summary: "Wall-mounted lithium home UPS with zero maintenance.",
    description:
      "Wall-hanging pure sinewave home UPS with an integrated LiFePO4 battery: quick charging and zero maintenance.",
    image: { key: "products/catalog/exide-invamaster", alt: "Exide Integra wall-mount lithium UPS" },
    specs: specs([
      ["Battery Tech", "Integrated LiFePO4"],
      ["Charge Time", "2.5 Hours Quick"],
      ["Footprint", "Sleek Wall Hanging"],
      ["Warranty", "5 Years Warranty"],
    ]),
    applications: ["Home"],
    warranty: "5 Years",
  },
  {
    slug: "utl-gamma-plus-1kva-12v",
    sku: "UTL-GAMMA-1K",
    name: "UTL Gamma Plus 1kVA / 12V",
    brand: "utl",
    category: "solar-inverters",
    typeLabel: "Solar Inverter PCU",
    subtitle: "Single Battery MPPT | Multi-colour LCD",
    badge: "rMPPT 30% More Power",
    summary: "Single-battery MPPT solar PCU with a multi-colour LCD.",
    description:
      "Single-battery solar PCU with rMPPT charge control for up to 30% more solar power, a multi-colour LCD and PCU, smart and hybrid working modes.",
    image: { key: "products/catalog/utl-gamma-plus", alt: "UTL Gamma Plus solar inverter" },
    specs: specs([
      ["Panel Support", "Up to 1000W Panels"],
      ["Efficiency", "95% MPPT Tracking"],
      ["Working Mode", "PCU / Smart / Hybrid"],
      ["Warranty", "2 Years Complete"],
    ]),
    applications: ["Solar", "Home"],
    warranty: "2 Years Complete",
  },
  {
    slug: "utl-alpha-plus-3kva",
    sku: "UTL-ALPHA-3K",
    name: "UTL Alpha+ 3kVA / 24V (or 48V)",
    brand: "utl",
    category: "solar-inverters",
    typeLabel: "Commercial Solar Inverter",
    subtitle: "Pure Sine Wave MPPT PCU | Petrol Pump Special",
    badge: "Heavy Duty Transformer",
    summary: "Heavy-duty MPPT PCU for petrol pumps and shops.",
    description:
      "Pure sine wave MPPT solar PCU with a heavy-duty transformer, built for petrol pumps and commercial loads up to a 1.5 ton AC.",
    image: { key: "products/catalog/utl-gamma-plus", alt: "UTL Alpha+ commercial solar inverter" },
    specs: specs([
      ["Panel Support", "Up to 3000W Panels"],
      ["Suitable For", "1.5 Ton AC + Petrol Pump"],
      ["Grid Feed", "Zero Export Option"],
      ["Service", "On-Site Service in Bihar"],
    ]),
    applications: ["Solar", "Commercial"],
    warranty: "2 Years",
  },
  {
    slug: "utl-shamsi-875va",
    sku: "UTL-SHAMSI-875",
    name: "UTL Shamsi 875VA / 12V",
    brand: "utl",
    category: "solar-inverters",
    typeLabel: "Hybrid PWM Solar Inverter",
    subtitle: "Runs on Single Battery | High Solar Priority",
    badge: "Affordable Solar Entry",
    summary: "Affordable single-battery solar inverter for village homes.",
    description:
      "Affordable hybrid PWM solar inverter that runs on a single battery, prioritises solar power and charges from low 90V AC supply.",
    image: { key: "products/catalog/utl-gamma-plus", alt: "UTL Shamsi hybrid solar inverter" },
    specs: specs([
      ["Panel Support", "Up to 600W Solar"],
      ["Low Voltage Charging", "Charges from 90V AC"],
      ["Suitable For", "1-2 BHK & Village Homes"],
      ["Warranty", "2 Years UTL Warranty"],
    ]),
    applications: ["Solar", "Home"],
    warranty: "2 Years",
  },
  {
    slug: "utl-ust-1536-150ah-c10",
    sku: "UTL-UST1536",
    name: "UTL UST 1536 (150Ah) C10",
    brand: "utl",
    category: "batteries",
    typeLabel: "Solar Deep Cycle Battery",
    subtitle: "High Density Lead Antimonial Alloy | Low Maintenance",
    badge: "5 Years Warranty",
    summary: "C10 solar tubular battery approved for PM Surya Ghar.",
    description:
      "Low-maintenance solar deep cycle battery with a high-density lead antimonial alloy, approved for PM Surya Ghar installations.",
    image: { key: "products/catalog/utl-gamma-plus", alt: "UTL UST 1536 solar battery" },
    specs: specs([
      ["Capacity", "150Ah @ C10 Rating"],
      ["Topping Cycle", "Every 9-12 Months"],
      ["Cycle Life", "Up to 2000 Cycles"],
      ["PM Surya Ghar", "Approved Component"],
    ]),
    applications: ["Solar"],
    warranty: "5 Years",
  },
  {
    slug: "microtek-smart-hybrid-1100",
    sku: "MT-SH1100",
    name: "Microtek Smart Hybrid 1100 (1100VA)",
    brand: "microtek",
    category: "inverters",
    typeLabel: "Pure Sinewave Home UPS",
    subtitle: "Micro-Controller Based Intelligent Intelli-Pure",
    badge: "2 Years Doorstep Warranty",
    summary: "Pure sinewave home UPS for TVs, fans, LEDs and PCs.",
    description:
      "Micro-controller based pure sinewave home UPS with a wide input range, ready for everyday home loads.",
    image: { key: "products/catalog/microtek-smart-hybrid", alt: "Microtek Smart Hybrid home UPS" },
    specs: specs([
      ["Battery Required", "1x 12V (100Ah-220Ah)"],
      ["Input Voltage", "100V - 300V Wide"],
      ["Appliances", "TV, Fans, LED, PC"],
      ["Stock Status", "Ready in Chakia"],
    ]),
    applications: ["Home"],
    warranty: "2 Years Doorstep",
  },
  {
    slug: "microtek-solar-ss-3000",
    sku: "MT-SS3000",
    name: "Microtek Solar SS 3000 (3kVA/24V)",
    brand: "microtek",
    category: "solar-inverters",
    typeLabel: "Solar PCU (Sine Wave)",
    subtitle: "Dual Battery System | Intelligent Solar Logic",
    badge: "Solar Hybrid PCU",
    summary: "3kVA sine wave solar PCU for shops and small clinics.",
    description: "Dual-battery sine wave solar PCU with intelligent solar logic for shops and small clinics.",
    image: { key: "products/catalog/microtek-smart-hybrid", alt: "Microtek Solar SS 3000 PCU" },
    specs: specs([
      ["Solar Module Support", "Up to 2400 Watts"],
      ["Commercial Use", "Shops & Small Clinics"],
      ["Peak Efficiency", "> 94% Inverter"],
      ["Warranty", "2 Years Manufacturer"],
    ]),
    applications: ["Solar", "Commercial"],
    warranty: "2 Years",
  },
  {
    slug: "microtek-max-10kva-online-ups",
    sku: "MT-MAX10K",
    name: "Microtek MAX 10kVA (192V DC)",
    brand: "microtek",
    category: "online-ups",
    typeLabel: "Industrial Grade Online UPS",
    subtitle: "True Double Conversion | Galvanic Isolation Ready",
    badge: "Zero Transfer Time",
    summary: "True double-conversion online UPS for critical loads.",
    description:
      "Industrial-grade true double-conversion online UPS with zero transfer time for petrol pumps, hospitals and other critical loads.",
    image: { key: "products/catalog/microtek-smart-hybrid", alt: "Microtek MAX 10kVA online UPS" },
    specs: specs([
      ["Application", "Petrol Pumps & Hospitals"],
      ["Transfer Time", "0 ms (Zero lag)"],
      ["Output Waveform", "Pure Sine Wave"],
      ["GeM Portal", "GeM Verified SKU"],
    ]),
    applications: ["Commercial", "Institutional"],
    warranty: "2 Years",
  },
  {
    slug: "microtek-smu-40a",
    sku: "MT-SMU40",
    name: "Microtek SMU 12V/24V (40 Amp)",
    brand: "microtek",
    category: "solar-inverters",
    typeLabel: "Solar Add-on Controller",
    subtitle: "Converts Normal Inverter to Solar | Low Cost",
    badge: "Inverter Converter",
    summary: "Turns any existing inverter into a solar inverter.",
    description:
      "Low-cost solar management unit that converts a normal home inverter into a solar inverter with automatic grid bypass.",
    image: { key: "products/catalog/microtek-smart-hybrid", alt: "Microtek solar management unit" },
    specs: specs([
      ["Compatibility", "Any Existing Inverter"],
      ["Current Rating", "40A Solar Current"],
      ["Grid Saving", "Automatic Grid Bypass"],
      ["Warranty", "1 Year Microtek"],
    ]),
    applications: ["Solar", "Home"],
    warranty: "1 Year",
  },
  // Homepage "Featured Products" (previously hard-coded).
  {
    slug: "utl-lithium-ion-battery",
    sku: "UTL-LFP",
    name: "Lithium-Ion Battery",
    brand: "utl",
    category: "batteries",
    typeLabel: "Lithium Battery",
    subtitle: "LiFePO4 | Long-Lasting Power",
    badge: "",
    summary: "High-efficiency LiFePO4 battery, long-lasting power.",
    description: "High-efficiency LiFePO4 battery, long-lasting power.",
    image: { key: "products/featured-utl", alt: "UTL lithium-ion battery with display" },
    specs: [],
    applications: ["Home", "Solar"],
    warranty: "",
    featured: true,
  },
  {
    slug: "exide-tubular-inverter-batteries",
    sku: "EX-HUPS",
    name: "Tubular Inverter Batteries",
    brand: "exide",
    category: "batteries",
    typeLabel: "Inverter Batteries",
    subtitle: "Exide HUPS Range",
    badge: "",
    summary: "Exide HUPS can be customized to suit your needs and budget, choose the right HUPS for you.",
    description: "Exide HUPS can be customized to suit your needs and budget, choose the right HUPS for you.",
    image: { key: "products/featured-exide", alt: "Exide Home tubular inverter battery" },
    specs: [],
    applications: ["Home"],
    warranty: "",
    featured: true,
  },
  {
    slug: "microtek-lithium-iron-phosphate",
    sku: "MT-LFP",
    name: "Lithium Iron Phosphate",
    brand: "microtek",
    category: "batteries",
    typeLabel: "Lithium Battery",
    subtitle: "LFP Chemistry",
    badge: "",
    summary: "Power that never fades — lithium ion.",
    description: "Power that never fades — lithium ion.",
    image: { key: "products/featured-microtek", alt: "Microtek lithium-ion LFP battery" },
    specs: [],
    applications: ["Home", "Solar"],
    warranty: "",
    featured: true,
  },
];
