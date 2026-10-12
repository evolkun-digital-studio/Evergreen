/**
 * Figures published on evergreenrecycler.in. All need owner confirmation before launch
 * (verify: true). Update value, label and note together.
 */
type Stat = {
  id: string;
  value: number;
  suffix: string;
  label: string;
  verify: boolean;
  note?: string;
};

/** Main stats row (source: "Tons Recycled Annually", "Corporate Clients", …). */
export const stats: Stat[] = [
  { id: "tons", value: 500, suffix: "+", label: "Tons recycled annually", verify: false },
  {
    id: "clients",
    value: 150,
    suffix: "+",
    label: "Corporate clients",
    verify: false,
    note: "Conflicts with 200+ clients served in the source hero",
  },
  { id: "landfill", value: 98, suffix: "%", label: "Zero-landfill rate", verify: false },
  { id: "years", value: 4, suffix: "+", label: "Years", verify: false },
];

/**
 * Annual processing capacity (source: Evergreen outreach material, 2026). This is what the plant can
 * process in a year, not what it has recycled: always show it with CAPACITY_LABEL. Keep it separate
 * from `stats.tons` (tonnes actually recycled).
 */
export type Capacity = { id: "e-waste" | "batteries" | "plastics"; material: string; tonnes: number; service: string; verify: boolean };

export const CAPACITY_LABEL = "Annual processing capacity";

export const capacity: Capacity[] = [
  { id: "e-waste", material: "E-waste", tonnes: 14400, service: "e-waste-recycling", verify: false },
  { id: "batteries", material: "Batteries", tonnes: 10800, service: "battery-recycling", verify: false },
  { id: "plastics", material: "Plastics", tonnes: 9000, service: "plastic-recycling", verify: false },
];

/** "14,400 MT" (metric tonnes). */
export const formatTonnes = (t: number) => `${t.toLocaleString("en-IN")} MT`;

export const capacityFor = (serviceSlug: string) => capacity.find(c => c.service === serviceSlug);

/** One sentence used wherever capacity is quoted in prose (entity block, llms.txt, FAQs). */
export const capacitySentence = () =>
  `${CAPACITY_LABEL}: ${capacity.map(c => `${c.material.toLowerCase()} ${formatTonnes(c.tonnes)}`).join(", ")}.`;

/** Sustainability figures (source: "Our Commitment"). */
export const impact: Stat[] = [
  { id: "carbon", value: 75, suffix: "%", label: "Carbon footprint reduction", verify: false },
  { id: "recovery", value: 92, suffix: "%", label: "Material recovery rate", verify: false },
  { id: "zero-landfill", value: 98, suffix: "%", label: "Zero landfill achievement", verify: false },
  { id: "clean-energy", value: 60, suffix: "%", label: "Clean energy usage", verify: false },
];

/** In the source hero but not published: one conflicts with `clients`, the other has no detail. */
export const unpublished: Stat[] = [
  { id: "clients-served", value: 200, suffix: "+", label: "Clients served", verify: true },
  { id: "districts", value: 15, suffix: "+", label: "Districts covered", verify: true },
];

/** Published wording that needs evidence or an owner decision before launch. */
export const verificationItems = [
  {
    id: "group-relationship",
    claim: "IndiaWMS is a group company",
    verify: true,
    note: "Confirm the exact legal relationship. The source does not state whether it is a parent, sister or group company.",
  },
  {
    id: "hydrometallurgy",
    claim: "Advanced hydrometallurgical processes and recovery of gold, silver and rare earth metals",
    verify: true,
    note: "Confirm whether this work is done in-house. Until then, the site says that precious-metal and rare-earth fractions are sent to authorised refiners.",
  },
  {
    id: "data-destruction",
    claim: "Certified data destruction",
    verify: true,
    note: "Confirm the standard, such as NIST 800-88. Until then, the site says data destruction with a certificate.",
  },
  {
    id: "eco-certified",
    claim: "Eco-certified",
    verify: true,
    note: "Confirm the certificate or remove this capability tag.",
  },
  {
    id: "capacity",
    claim: "Annual processing capacity: e-waste 14,400 MT, batteries 10,800 MT, plastics 9,000 MT",
    verify: true,
    note: "From Evergreen's outreach material. Confirm against the UPPCB authorisation (authorised capacity) before launch.",
  },
  {
    id: "tons-vs-capacity",
    claim: "500+ tons recycled annually",
    verify: true,
    note: "Kept separate from processing capacity. Confirm the actual figure or replace it.",
  },
  {
    id: "cpcb-epr-registration",
    claim: "Registered on the CPCB EPR portal",
    verify: true,
    note: "The outreach material says “approved by the SPCB and CPCB”. Shown in development only until the CPCB registration number is confirmed. Never write “CPCB approved” without it.",
  },
  {
    id: "business-contact-title",
    claim: "Mukul Agarwal, business enquiries",
    verify: true,
    note: "Confirm his title before showing one. Until then the site shows the name and phone under “Business enquiries”.",
  },
  {
    id: "process-steps",
    claim: "Plastic washing and pelletising; battery discharge, dismantling and black mass / lead recovery",
    verify: true,
    note: "Confirm which of these steps run in-house in Sitapur and which go to authorised partners. The site words them as steps in the chain, not as in-house claims.",
  },
  {
    id: "free-pickup-pan-india",
    claim: "Free pickup",
    verify: true,
    note: "The site says pickup is free; the outreach material adds PAN India pickup. Confirm whether pickup outside UP is also free. Until then the two are stated separately.",
  },
  {
    id: "stock-photos",
    claim: "Stock photography across the site",
    verify: true,
    note: "Replace with Evergreen's own photos (list in public/images/evergreen/README.md).",
  },
  {
    id: "geo",
    claim: "Plant coordinates in the Organization JSON-LD",
    verify: true,
    note: "site.geo is approximate (Mahmudabad, Sitapur). Replace with the plant's exact map pin.",
  },
  {
    id: "domain-email",
    claim: "evergreenewaste2021@gmail.com",
    verify: true,
    note: "Keep this address until a domain email such as info@evergreenrecycler.in exists.",
  },
] as const;

export const formatStat = (s: Stat) => `${s.value}${s.suffix}`;
