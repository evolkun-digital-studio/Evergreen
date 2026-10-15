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

export const about = {
  paragraphs: [
    {
      lead: site.legalName,
      body: "is one of India's leading companies recycling electrical and electronic (WEEE) waste in accordance with government guidelines. Our integrated, best-in-class technology ensures environmental safety and sustainability.",
    },
    {
      body: "We handle large quantities of high-quality e-waste and are able to remove all components from electrical items, including metals and hazardous materials such as lead, mercury, cadmium and PCBs, without leaving anything behind. We are ISO 180 certified and adhere to strict environmental regulations for the safe handling and disposal of hazardous products, helping keep our environment green.",
    },
  ],
  highlights: [
    { title: "Operating Since", body: "Successfully recycling e-waste since 2020" },
    { title: "ISO Certified", body: "Adheres to strict environmental regulations for safe hazardous product handling" },
    { title: "Complete Removal", body: "Removes mercury, lead, cadmium, PCBs and all hazardous components from electrical items" },
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
  portrait: Photo;
  /** Organization JSON-LD relation: the owner is also `founder`. */
  founder?: boolean;
};

/** Order is display order (Owner first). Used by /about and the Organization JSON-LD. */
export const leadership: Leader[] = [
  {
    id: "irfan-ahmad",
    honorific: site.owner.honorific,
    name: site.owner.name,
    role: site.owner.role,
    bio: `Has led ${site.legalName} in ${site.address.locality} since ${site.founded}.`,
    phone: site.phone,
    portrait: portraits.irfanAhmad,
    founder: true,
  },
  {
    id: "ramesh-yadav",
    honorific: "Mr.",
    name: "Ramesh Yadav",
    role: "Associate Director",
    // DUMMY bio (2026-10-10): generic role description, no claims. Replace with the real one when supplied.
    bio: "Works with the owner on day-to-day operations, compliance and client relationships.",
    portrait: portraits.rameshYadav,
  },
];

export const steps = [
  {
    title: "Request pickup",
    short: "Call, WhatsApp or use the form.",
    body: "Contact us by phone, WhatsApp or the online form. Tell us the type of waste, the approximate quantity and the location, and we will schedule a free pickup at a time that suits you.",
  },
  {
    title: "Certified collection",
    short: "Tagged, documented, safely transported.",
    body: "Our trained team collects the waste following safety procedures. Every item is tagged and documented, and transported in compliant vehicles with chain-of-custody records.",
  },
  {
    title: "Sorting and assessment",
    short: "Sorted by material; hazardous parts set aside.",
    body: "Materials are sorted by type: electronics, batteries, metals and plastics. Hazardous components are separated for specialised treatment under CPCB and state guidelines.",
  },
  {
    title: "Processing and recovery",
    short: "Dismantled, shredded, materials recovered.",
    body: "We dismantle and shred the material and recover what can be used again. Precious metals, copper and polymers go back into manufacturing.",
  },
  {
    title: "Certificate and report",
    short: "Recycling certificate for your records.",
    body: "You receive a recycling certificate with the weight, a material breakdown and a disposal compliance report. It is ready for audits and for your CSR and ESG reporting.",
  },
];

/** `verify: true` entries stay hidden until the evidence is confirmed. */
export const registrations: { title: string; detail: string; body: string; verify?: boolean }[] = [
  {
    title: "GST registration",
    detail: `GSTIN ${site.gstin}`,
    body: "Registered for GST in Uttar Pradesh.",
  },
  {
    title: "E-waste authorisation",
    detail: "Uttar Pradesh Pollution Control Board (UPPCB)",
    body: "Authorised under the E-Waste (Management) Rules, 2022.",
  },
  {
    title: "Battery waste authorisation",
    detail: "Battery Waste Management Rules",
    body: "Authorised for the safe processing of waste batteries.",
  },
  {
    title: "MSME registration",
    detail: "Udyam registration",
    body: "Registered as a micro, small and medium enterprise.",
  },
  {
    title: "CPCB EPR portal",
    detail: "Central Pollution Control Board",
    body: "Registered on the CPCB EPR portal.",
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

