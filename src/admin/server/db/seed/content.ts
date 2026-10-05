import { staticImage } from "@/admin/content/images";
import type { TestimonialBadge } from "@/admin/content/types";

interface SeedTestimonial {
  name: string;
  location: string;
  quote: string;
  rating: number;
  badgeKind: TestimonialBadge;
  badgeLabel: string;
  avatar: ReturnType<typeof staticImage> | null;
  isSample: boolean;
}

const clientTestimonials: SeedTestimonial[] = [
  {
    name: "Mamta Verma",
    location: "Chakia, East Champaran • Homeowner",
    quote:
      "Installed a 5kW UTL on-grid solar system with Ishita Traders last summer. Our monthly electricity bill dropped from ₹6,200 to barely ₹450 during peak heat. Their Chakia installation team did clean wiring and took care of all the net-metering paperwork seamlessly.",
    rating: 5,
    badgeKind: "installation",
    badgeLabel: "Verified Installation",
    avatar: staticImage("testimonials/mamta-verma", "Mamta Verma"),
    isSample: false,
  },
  {
    name: "Ajay Kumar Singh",
    location: "Raghunath Pur, East Champaran, Bihar • Petrol Pump",
    quote:
      "We operate our petrol dispensing units and cold drink refrigerators entirely on the solar inverter solution purchased from Ishita Traders. The diesel generator cost savings alone paid back half our solar investment in the first 8 months.",
    rating: 5,
    badgeKind: "commercial",
    badgeLabel: "Verified Commercial",
    avatar: staticImage("testimonials/ajay-kumar-singh", "Ajay Kumar Singh"),
    isSample: false,
  },
  {
    name: "Dr. Alok Kumar Verma",
    location: "Motihari, Bihar • Verma Diagnostic Clinic",
    quote:
      "Running sensitive ultrasound and haematology machines requires zero voltage dips. Ishita Traders recommended and set up a Microtek 10kVA Online UPS with heavy Exide tubular batteries. In 18 months, we haven't faced a single minute of machine downtime. Exemplary local after-sales service!",
    rating: 5,
    badgeKind: "healthcare",
    badgeLabel: "Verified Healthcare Buyer",
    avatar: staticImage("testimonials/alok-kumar-verma", "Dr. Alok Kumar Verma"),
    isSample: false,
  },
];

/** The design shows 25 slides ("01 / 25"); placeholders fill the gap until real reviews arrive. */
const TESTIMONIAL_SLOTS = 25;

const sampleTestimonials: SeedTestimonial[] = Array.from(
  { length: TESTIMONIAL_SLOTS - clientTestimonials.length },
  (_, i) => ({
    name: `Sample client ${String(clientTestimonials.length + i + 1).padStart(2, "0")}`,
    location: "Town, District • Customer type",
    quote: "Sample testimonial — replace this card with a real review from an Ishita Traders customer.",
    rating: 5,
    badgeKind: "sample",
    badgeLabel: "Sample review",
    avatar: null,
    isSample: true,
  }),
);

export const seedTestimonials = [...clientTestimonials, ...sampleTestimonials];

export const seedFaqs = [
  {
    question: "What is the estimated budget required for installing a solar project?",
    answer: "",
  },
  { question: "What is the warranty period for the solar panels?", answer: "" },
  {
    question: "Which areas do you provide services in, and which solar brands do you install?",
    answer: "",
  },
  { question: "Where is your office located, and do you charge for home visits?", answer: "" },
];
