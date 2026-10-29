import type { StaticImageData } from "next/image";

import banks from "@/assets/images/pages/clients/industries/banks.webp";
import government from "@/assets/images/pages/clients/industries/government.webp";
import homes from "@/assets/images/pages/clients/industries/homes.webp";
import hospitals from "@/assets/images/pages/clients/industries/hospitals.webp";
import industrial from "@/assets/images/pages/clients/industries/industrial.webp";
import offices from "@/assets/images/pages/clients/industries/offices.webp";
import petrolPumps from "@/assets/images/pages/clients/industries/petrol-pumps.webp";
import schools from "@/assets/images/pages/clients/industries/schools.webp";
import featuredStoryPoster from "@/assets/images/pages/clients/featured-story.webp";
import homeSolarVideo from "@/assets/images/pages/clients/videos/home-solar.webp";
import institutionalVideo from "@/assets/images/pages/clients/videos/institutional-solar.webp";
import petrolPumpVideo from "@/assets/images/pages/clients/videos/petrol-pump.webp";
import type { FigmaIconName } from "@/components/pages/figma-icons";

/**
 * Our Clients page copy (Figma zj4F9WF6L3bOUAsZTbe9xJ, frame 297:1139). Reviews come from
 * Admin → Testimonials; video links from Admin → Site content → Homepage.
 */

export interface VideoStory {
  title: string;
  duration: string;
  poster: { src: StaticImageData; alt: string };
}

export const featuredStory = {
  eyebrow: "Featured client story",
  title: "Hear It From Our Clients",
  description: "A closer look at how our solutions are making a difference.",
  tag: "Residential Client",
  duration: "03:48",
  poster: { src: featuredStoryPoster, alt: "A homeowner and a technician talking beside rooftop solar panels" },
};

export const industries = {
  eyebrow: "Industries we serve",
  title: "Different Needs. One Reliable Partner.",
  description:
    "Each sector has unique power requirements. We provide suitable solar and electrical solutions based on real-world needs.",
  items: [
    {
      icon: "industryHomes",
      title: "Homes & Residential",
      text: "Solar panels, inverters and batteries for reliable power at home.",
      image: { src: homes, alt: "A family home with rooftop solar panels" },
    },
    {
      icon: "industryHospitals",
      title: "Hospitals",
      text: "Uninterrupted power solutions for critical equipment and daily operations.",
      image: { src: hospitals, alt: "A hospital building" },
    },
    {
      icon: "industryBanks",
      title: "Banks & Financial Institutions",
      text: "Reliable backup power for seamless banking operations.",
      image: { src: banks, alt: "A bank branch entrance" },
    },
    {
      icon: "industryPetrol",
      title: "Petrol Pumps",
      text: "Consistent power solutions for fuel stations and operational needs.",
      image: { src: petrolPumps, alt: "A fuel station canopy with solar panels" },
    },
    {
      icon: "industrySchools",
      title: "Schools & Educational Institutions",
      text: "Solar and backup power for uninterrupted learning environments.",
      image: { src: schools, alt: "A school campus" },
    },
    {
      icon: "industryOffices",
      title: "Commercial Offices",
      text: "Power solutions for offices, shops and commercial spaces to keep your business running.",
      image: { src: offices, alt: "A glass office tower" },
    },
    {
      icon: "industryGovernment",
      title: "Government Organizations",
      text: "Supply and installation for government buildings and public sector projects.",
      image: { src: government, alt: "A government building with the national flag" },
    },
    {
      icon: "industryIndustrial",
      title: "Industrial Businesses",
      text: "Power and electrical solutions for small and medium industrial operations.",
      image: { src: industrial, alt: "An industrial warehouse with rooftop solar" },
    },
  ] satisfies { icon: FigmaIconName; title: string; text: string; image: { src: StaticImageData; alt: string } }[],
};

export const clientReviews = {
  eyebrow: "What our clients say",
  title: "Real Experiences from Real People",
  /** Reviews shown before "View More" (two rows of three on desktop). */
  initial: 6,
  more: "View More",
};

export const videoStories = {
  eyebrow: "See the difference on site",
  title: "Video Stories from Our Clients",
  description: "Short videos from real installations and happy clients.",
  viewAll: "View All Videos",
  items: [
    {
      title: "Home Solar Installation Experience",
      duration: "01:52",
      poster: { src: homeSolarVideo, alt: "Installers fitting rooftop solar on a family home" },
    },
    {
      title: "Petrol Pump Power Solution",
      duration: "02:18",
      poster: { src: petrolPumpVideo, alt: "Power equipment installed at a fuel station" },
    },
    {
      title: "Institutional Solar Setup",
      duration: "02:05",
      poster: { src: institutionalVideo, alt: "Solar panels across an institution's rooftop" },
    },
  ] satisfies VideoStory[],
};
