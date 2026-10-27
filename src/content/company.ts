import type { LucideIcon } from "lucide-react";
import {
  Factory,
  GraduationCap,
  HardHat,
  Hospital,
  Landmark,
  Laptop,
  Store,
} from "lucide-react";
import { site } from "@/config/site";
import { portraits, type Photo } from "@/content/images";
import { formatTonnes } from "@/content/stats";

export const about = {
  paragraphs: [
    {
      lead: site.legalName,
      body: "is an authorised recycler of e-waste, batteries and plastics, operating from Sitapur, Uttar Pradesh. Since 2020, we have helped organisations across India manage retired assets through documented, environmentally responsible recycling.",
    },
    {
      body: "Our work covers inspection and physical asset verification, reverse logistics, data destruction and degaussing, refurbishment, material recovery and final certification.",
    },
  ],
  highlights: [
    {
      title: "Operating since 2020",
      body: "A documented recycling operation serving organisations across India",
    },
    {
      title: "Authorised capacity",
      body: "14,400 MT of e-waste, 10,800 MT of batteries and 9,000 MT of plastics per year",
    },
    {
      title: "End-to-end service",
      body: "Inspection, reverse logistics, secure data destruction, recovery and certificates",
    },
  ],
};

export type Leader = {
  /** Anchor on /about and the JSON-LD @id fragment. */
  id: string;
  honorific: string;
  name: string;
  role: string;
  /** CONFIRM until supplied: hidden from the public UI. */
  bio: string;
  phone?: string;
  linkedin?: string;
  portrait?: Photo;
  /** Organization JSON-LD relation: the owner is also `founder`. */
  founder?: boolean;
};

/** Order is display order (Founder first). Used by /about and the Organization JSON-LD. */
export const leadership: Leader[] = [
  {
    id: "irfan-ahmad",
    honorific: site.owner.honorific,
    name: site.owner.name,
    role: site.owner.role,
    bio: `Founded ${site.legalName} and has led its recycling operations since ${site.founded}.`,
    phone: site.phone,
    portrait: portraits.irfanAhmad,
    founder: true,
  },
  {
    id: "pradeep-gopala-krishana",
    honorific: "Mr.",
    name: "Pradeep Gopala Krishana",
    role: "Associate Director, ESG Compliance",
    bio: "Leads ESG and regulatory compliance across recycling and disposal programmes.",
    portrait: portraits.pradeepGopalaKrishana,
  },
  {
    id: "mukul-agarwal",
    honorific: site.businessContact.honorific,
    name: site.businessContact.name,
    role: site.businessContact.title,
    bio: "Leads strategic planning and client programmes for responsible waste management.",
    phone: site.businessContact.phone,
    portrait: portraits.mukulAgarwal,
  },
  {
    id: "naveen-kumar-gupta",
    honorific: "Mr.",
    name: "Naveen Kumar Gupta",
    role: "Operations Head — PAN India",
    bio: "Coordinates collection and reverse-logistics operations across India.",
  },
];

export const steps = [
  {
    title: "Inspection and asset verification",
    short: "Inventory assessed at your site.",
    body: "We inspect the material and verify the asset inventory at your site so the collection plan, handling method and documentation match what you actually have.",
  },
  {
    title: "Reverse logistics",
    short: "Tracked collection across India.",
    body: "Our team arranges collection through our fleet and approved logistics partners. Assets are tagged, documented and tracked through the chain of custody.",
  },
  {
    title: "Data destruction and degaussing",
    short: "Data sanitised before recovery.",
    body: "Data-bearing equipment is sanitised by software, degaussing or physical destruction, depending on the media and the agreed disposal route. The work can be arranged on site or at our facility.",
  },
  {
    title: "Reconditioning and refurbishment",
    short: "Reusable equipment gets a longer life.",
    body: "Where reuse is appropriate, equipment is identified, sanitised, tested and reconditioned. Components are repaired or replaced before the asset returns to productive use.",
  },
  {
    title: "Recycling and material recovery",
    short: "Materials separated for authorised recovery.",
    body: "Non-reusable equipment is dismantled and sorted into plastics, metals, glass and hazardous fractions. Recoverable materials are routed back into manufacturing through authorised channels.",
  },
  {
    title: "Certificate and closure report",
    short: "Evidence ready for your records.",
    body: "You receive the applicable recycling, disposal or data-destruction certificate, supported by weights and chain-of-custody records for audits and ESG reporting.",
  },
];

/** `verify: true` entries stay hidden until the evidence is confirmed. */
export const registrations: {
  title: string;
  detail: string;
  body: string;
  verify?: boolean;
}[] = [
  {
    title: "GST registration",
    detail: `GSTIN ${site.gstin}`,
    body: "Government of India registration dated 23 October 2020.",
  },
  {
    title: "E-waste CTE",
    detail: "UPPCB · 2025–2030",
    body: `Consent to Establish; stated annual capacity ${formatTonnes(14400)}.`,
  },
  {
    title: "E-waste CTO and EPR",
    detail: "UPPCB · 2025–2029",
    body: `Consent to Operate and EPR registration; stated annual capacity ${formatTonnes(14400)}.`,
  },
  {
    title: "Battery CTE",
    detail: "UPPCB · 2025–2030",
    body: `Consent to Establish; stated annual capacity ${formatTonnes(10800)}.`,
  },
  {
    title: "Battery CTO and EPR",
    detail: "UPPCB · CTO 2025–2029 · EPR 2026–2031",
    body: `Consent to Operate and EPR registration; stated annual capacity ${formatTonnes(10800)}.`,
  },
  {
    title: "Plastic CTE",
    detail: "UPPCB · 2023–2028",
    body: `Consent to Establish; stated annual capacity ${formatTonnes(9000)}.`,
  },
  {
    title: "Plastic CTO and EPR",
    detail: "UPPCB · CTO 2023–2027 · EPR auto-renewal",
    body: `Consent to Operate and EPR registration; stated annual capacity ${formatTonnes(9000)}.`,
  },
  {
    title: "Hazardous and other waste authorisation",
    detail: "UPPCB · 2022–2027",
    body: "Authorisation for the hazardous-waste operations stated in the company profile.",
  },
  {
    title: "MSME registration",
    detail: "Ministry of MSME · Udyam registration",
    body: "Registered as a micro, small and medium enterprise.",
  },
  {
    title: "ISO 45001:2018",
    detail: "Occupational Health & Safety Management System",
    body: "Certified for occupational health and safety at our plant.",
  },
  {
    title: "ISO 14001:2015",
    detail: "Environmental Management System",
    body: "Certified for environmental management in our recycling operations.",
  },
  {
    title: "Quality Management System",
    detail: "Quality certification",
    body: "Certified for quality standards in recycling operations.",
  },
];

export const industries: { name: string; icon: LucideIcon }[] = [
  { name: "IT companies", icon: Laptop },
  { name: "Banks and NBFCs", icon: Landmark },
  { name: "Manufacturing plants", icon: Factory },
  { name: "Hospitals", icon: Hospital },
  { name: "Educational institutions", icon: GraduationCap },
  { name: "Retailers", icon: Store },
  { name: "Construction", icon: HardHat },
];

export const sustainability = {
  commitment: [
    "Every kilogram of e-waste we recycle keeps toxic material out of India's soil and water.",
    "Our sustainability goals follow the UN Sustainable Development Goals and India's E-Waste (Management) Rules.",
  ],
  /** `summary` is the one-line version for the home page band; `body` is used on /sustainability. */
  initiatives: [
    {
      title: "Circular economy",
      summary: "92% of material back into use",
      body: "We recover more than 92% of materials and return them to the production cycle. This reduces the extraction of new resources and the pollution that comes with it.",
    },
    {
      title: "Aligned with SDG 12 and 13",
      summary: "Production and climate goals",
      body: "Our practices follow UN Sustainable Development Goal 12 (responsible consumption and production) and Goal 13 (climate action).",
    },
    {
      title: "Green facility",
      summary: "Moving to renewable energy",
      body: "The facility is moving to renewable energy in stages. LED lighting, planned solar installations and water recycling are part of this work.",
    },
    {
      title: "Community awareness",
      summary: "Drives across Sitapur district",
      body: "We run e-waste awareness drives in schools, panchayats and corporate offices across Sitapur district.",
    },
  ],
};
