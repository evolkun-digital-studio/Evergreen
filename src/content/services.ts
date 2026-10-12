import type { LucideIcon } from "lucide-react";
import { Battery, Cpu, Factory, Recycle, ShieldCheck, Wrench } from "lucide-react";
import { library, photos, stepPhotos, type Photo } from "@/content/images";
import { steps } from "@/content/company";

/** A regulation or notice we cite. Links go to the government copy. */
export type Source = { label: string; url: string };

export const sources = {
  eWasteRules: { label: "E-Waste (Management) Rules, 2022", url: "https://cpcb.gov.in/uploads/Projects/E-Waste/e-waste_rules_2022.pdf" },
  eWasteFaq: { label: "CPCB, FAQs under the E-Waste (Management) Rules, 2022", url: "https://cpcb.nic.in/uploads/Projects/E-Waste/FAQ_ewaste_23012024.pdf" },
  eWastePortal: { label: "CPCB E-Waste EPR portal", url: "https://eprewaste.cpcb.gov.in/" },
  batteryRules: {
    label: "Battery Waste Management Rules, 2022 (Gazette notification)",
    url: "https://thc.nic.in/Central%20Governmental%20Rules/Battery%20Waste%20Management%20Rules,%202022.pdf",
  },
  plasticPortal: { label: "CPCB EPR portal for plastic packaging", url: "https://eprplastic.cpcb.gov.in/" },
} satisfies Record<string, Source>;

export type AcceptItem = { name: string; detail: string; photo?: Photo };
export type WorkflowStep = { title: string; caption: string; photo: Photo };
export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  title: string;
  icon: LucideIcon;
  /** One-line summary for cards and lists. */
  summary: string;
  /** Lead under the H1 (40 words or fewer). */
  lead: string;
  /** Short definition of the key term, used on first mention (AEO). */
  definition?: { term: string; text: string };
  accepts: AcceptItem[];
  workflow: WorkflowStep[];
  /** "What you receive". */
  receives: string[];
  faq: Faq[];
  /** Two related services, by slug. */
  related: [string, string];
  sources: Source[];
  metaTitle: string;
  metaDescription: string;
  /** Claims in this service that need owner confirmation. */
  confirm?: string[];
};

/** Every job ends with the same paperwork; services add to it. */
const certificate = "A recycling certificate with the weight and a material breakdown";
const complianceReport = "A disposal compliance report, ready for audits and CSR or ESG reporting";
const eprSupport = "EPR obligation and CPCB compliance support, with digital documentation";

export const services: Service[] = [
  {
    slug: "e-waste-recycling",
    title: "E-waste recycling",
    icon: Cpu,
    summary: "Dismantling and recycling of laptops, desktops, servers, phones and other electronics.",
    lead: "We collect laptops, desktops, servers, phones and other electronics from your site, dismantle them in Sitapur and recover the material. You get a recycling certificate for every pickup.",
    definition: {
      term: "E-waste",
      text: "E-waste is electrical and electronic equipment that has been discarded, along with its parts and consumables.",
    },
    accepts: [
      { name: "IT equipment", detail: "Laptops, desktops, servers, monitors and networking gear" },
      { name: "Phones and tablets", detail: "Mobile phones, tablets and their chargers" },
      { name: "Office electronics", detail: "Printers, copiers, UPS units and peripherals" },
      { name: "Other electronic equipment", detail: "Tell us what you have and we will confirm" },
      { name: "Data-bearing devices", detail: "Drives and devices that go through data destruction, with a certificate" },
    ],
    workflow: steps.map((s, i) => ({ title: s.title, caption: s.short, photo: stepPhotos[i] })),
    receives: [certificate, "A certificate of data destruction for data-bearing devices", complianceReport, eprSupport],
    faq: [
      {
        q: "Do you pick up e-waste outside Uttar Pradesh?",
        a: "Yes. We pick up from client locations anywhere in India and bring the material to our plant in Sitapur, Uttar Pradesh. Tell us the type of waste, the approximate quantity and the address, and we will plan the collection and the paperwork that goes with it.",
      },
      {
        q: "Do you provide a recycling certificate for EPR?",
        a: "Yes. Every pickup ends with a recycling certificate that records the weight and a material breakdown, plus a disposal compliance report. Producers with EPR obligations also get support with CPCB compliance and digital documentation for their filings on the CPCB E-Waste EPR portal.",
      },
      {
        q: "What is your e-waste processing capacity?",
        a: "Our annual processing capacity for e-waste is 14,400 metric tonnes. This is the quantity the Sitapur plant can process in a year, not a record of what has been recycled. Bulk and repeat pickups are planned against that capacity.",
      },
      {
        q: "Who has to hand e-waste to a registered recycler?",
        a: "Under the E-Waste (Management) Rules, 2022, bulk consumers such as offices, banks and factories must hand their e-waste only to registered recyclers or refurbishers, and keep a record of what they hand over. Our certificate and report give you that record.",
      },
      {
        q: "What happens to the data on old laptops and drives?",
        a: "Devices that hold data go through data destruction before recycling, and you receive a certificate for it. If your policy needs a specific method or witnessing, tell us when you request the pickup.",
      },
    ],
    related: ["metal-recovery", "secure-disposal"],
    sources: [sources.eWasteRules, sources.eWasteFaq, sources.eWastePortal],
    metaTitle: "E-Waste Recycling Company in Sitapur, UP | PAN India Pickup",
    metaDescription:
      "Authorised e-waste recycler in Sitapur, UP, with PAN India pickup. Laptops, servers and phones recycled with data destruction, certificates and EPR support.",
    confirm: ["Data destruction standard (source says “certified data destruction”)"],
  },
  {
    slug: "battery-recycling",
    title: "Battery recycling",
    icon: Battery,
    summary: "Processing of lead-acid, lithium-ion, NiMH and industrial batteries.",
    lead: "We process lead-acid, lithium-ion, NiMH and industrial batteries, collected from your site anywhere in India. Valuable materials such as lithium and cobalt are extracted safely and returned to use.",
    definition: {
      term: "Black mass",
      text: "Black mass is the dark powder left after lithium-ion cells are shredded. It holds the lithium, cobalt, nickel and manganese that refiners recover.",
    },
    accepts: [
      { name: "Lead-acid batteries", detail: "Vehicle, inverter and UPS batteries", photo: library.leadAcid },
      { name: "Lithium-ion batteries", detail: "Cells, packs and modules from devices, tools and vehicles", photo: library.batteryCells },
      { name: "NiMH batteries", detail: "Rechargeable cells and packs" },
      { name: "Industrial batteries", detail: "Stationary and traction batteries from plants and sites" },
    ],
    workflow: [
      { title: "Collection", caption: "Batteries are packed and collected from your site.", photo: photos.process },
      { title: "Discharge and safe storage", caption: "Batteries are discharged and stored apart by chemistry.", photo: library.batteryCollection },
      { title: "Dismantling", caption: "Packs and devices are opened and the cells removed.", photo: library.eWasteBench },
      { title: "Black mass and lead recovery", caption: "Lithium-ion cells give black mass; lead-acid batteries give lead.", photo: library.recoveredScrap },
    ],
    receives: [certificate, complianceReport, eprSupport],
    faq: [
      {
        q: "How do I recycle lithium-ion batteries in Uttar Pradesh?",
        a: "Hand them to an authorised recycler. Request a pickup from Evergreen with the battery type, the approximate quantity and the location. We collect them, process them at our plant in Sitapur, Uttar Pradesh, and give you a recycling certificate. Keep damaged or swollen cells apart and tell us about them.",
      },
      {
        q: "What is your battery processing capacity?",
        a: "Our annual processing capacity for batteries is 10,800 metric tonnes. This is what the Sitapur plant can process in a year, not a record of what has been recycled.",
      },
      {
        q: "Do you accept lead-acid batteries?",
        a: "Yes. We accept lead-acid batteries from vehicles, inverters and UPS systems, as well as lithium-ion, NiMH and industrial batteries. Tell us the type and the quantity when you request a pickup.",
      },
      {
        q: "Who has to send waste batteries to a registered recycler?",
        a: "The Battery Waste Management Rules, 2022 require waste batteries to be sent to registered recyclers or refurbishers, so that hazardous material is handled safely and useful material is recovered. Landfill and incineration of waste batteries are not allowed.",
      },
      {
        q: "Do you pick up batteries outside Uttar Pradesh?",
        a: "Yes. We pick up from client locations anywhere in India and process the batteries at our plant in Sitapur, Uttar Pradesh. Tell us the battery type, the quantity and whether any cells are damaged.",
      },
    ],
    related: ["e-waste-recycling", "metal-recovery"],
    sources: [sources.batteryRules],
    metaTitle: "Battery Recycling in Sitapur, UP | Lithium-ion and Lead-acid",
    metaDescription:
      "Lithium-ion, lead-acid, NiMH and industrial battery recycling in Sitapur, UP, with PAN India pickup, recycling certificates and EPR compliance support.",
  },
  {
    slug: "plastic-recycling",
    title: "Plastic recycling",
    icon: Recycle,
    summary: "Sorting, shredding and pelletising of PET, HDPE, PP and ABS plastics.",
    lead: "We process PET, HDPE, PP and ABS plastics. The plastic is sorted, shredded and pelletised so that manufacturers can use it again.",
    accepts: [
      { name: "PET", detail: "Bottles, food trays and other clear packaging" },
      { name: "HDPE", detail: "Cans, containers, crates and pipes" },
      { name: "PP", detail: "Caps, tubs, woven sacks and moulded parts" },
      { name: "ABS", detail: "Housings and casings from electronics and appliances" },
    ],
    workflow: [
      { title: "Collection", caption: "Plastic is collected from your site, loose or baled.", photo: library.bottleHeap },
      { title: "Sorting", caption: "Sorted by polymer type and colour.", photo: library.plasticSorting },
      { title: "Shredding and washing", caption: "Shredded into flakes and washed clean.", photo: library.plasticFlakes },
      { title: "Pelletising", caption: "Extruded into pellets that manufacturers can reuse.", photo: library.plasticGranules },
    ],
    receives: [certificate, complianceReport, eprSupport],
    faq: [
      {
        q: "Which plastics do you recycle?",
        a: "We recycle PET, HDPE, PP and ABS. Each type is sorted apart because each plastic melts and behaves differently. Clean, single-type pellets are what manufacturers can reuse. If you have another polymer or a mixed stream, tell us and we will confirm.",
      },
      {
        q: "What is your plastic processing capacity?",
        a: "Our annual processing capacity for plastics is 9,000 metric tonnes. This is what the Sitapur plant can process in a year, not a record of what has been recycled.",
      },
      {
        q: "Do you provide documents for plastic EPR?",
        a: "Yes. You receive a recycling certificate with the weight and a material breakdown, and support with EPR obligations and CPCB compliance, with digital documentation. Producers, importers and brand owners file on CPCB's EPR portal for plastic packaging.",
      },
      {
        q: "Do you collect plastic waste from outside Uttar Pradesh?",
        a: "Yes. We pick up from client locations anywhere in India and process the plastic at our plant in Sitapur, Uttar Pradesh.",
      },
    ],
    related: ["e-waste-recycling", "industrial-scrap-management"],
    sources: [sources.plasticPortal],
    metaTitle: "Plastic Recycling in Sitapur, UP | PET, HDPE, PP and ABS",
    metaDescription:
      "PET, HDPE, PP and ABS plastic recycling in Sitapur, UP. Sorted, shredded and pelletised for reuse, with PAN India pickup and EPR compliance support.",
  },
  {
    slug: "metal-recovery",
    title: "Metal recovery",
    icon: Wrench,
    summary: "Recovery of copper, aluminium, gold and silver from electronic scrap.",
    lead: "We recover copper, aluminium, gold and silver from electronic scrap. Precious metal and rare earth fractions are sent to authorised refiners.",
    accepts: [
      { name: "Copper", detail: "Cables, wiring, motors and transformer windings", photo: library.copperStrands },
      { name: "Aluminium", detail: "Casings, frames, heat sinks and cans", photo: library.aluminium },
      { name: "Gold and silver", detail: "Circuit boards, connectors and contacts" },
    ],
    workflow: [
      { title: "Collection and sorting", caption: "Scrap is collected and sorted by source.", photo: library.phones },
      { title: "Dismantling", caption: "Devices are taken apart by hand.", photo: library.eWasteDismantling },
      { title: "Separation", caption: "Copper and aluminium are separated for reuse.", photo: library.recoveredScrap },
      { title: "Refining", caption: "Precious-metal fractions go to authorised refiners.", photo: library.eWasteBoards },
    ],
    receives: [certificate, complianceReport, eprSupport],
    faq: [
      {
        q: "Which metals do you recover from e-waste?",
        a: "We recover copper and aluminium from electronic scrap and return them to use. Gold, silver and rare earth fractions are sent to authorised refiners. Circuit boards and cables hold most of the value.",
      },
      {
        q: "How are EPR metal obligations linked to recycling?",
        a: "Under the E-Waste (Management) Rules, 2022, EPR certificates are generated against key metals recovered from e-waste: gold, copper, iron and aluminium. Our EPR calculator estimates a producer's obligation for each metal.",
      },
      {
        q: "Why recover metal from e-waste?",
        a: "Circuit boards and cables contain copper, aluminium and small amounts of gold and silver. Recovering them returns the metal to manufacturing and reduces the need for newly mined metal.",
      },
      {
        q: "Do you pick up metal scrap outside Uttar Pradesh?",
        a: "Yes. We pick up from client locations anywhere in India and process the scrap at our plant in Sitapur, Uttar Pradesh.",
      },
    ],
    related: ["e-waste-recycling", "industrial-scrap-management"],
    sources: [sources.eWasteRules],
    metaTitle: "Copper and Aluminium Recovery from E-Scrap | Sitapur, UP",
    metaDescription:
      "Copper and aluminium recovery from electronic scrap in Sitapur, UP. Precious-metal fractions go to authorised refiners. PAN India pickup, certificates.",
    confirm: ["Advanced hydrometallurgical processes and whether gold, silver and rare earth metals are recovered in-house or by partner refiners"],
  },
  {
    slug: "industrial-scrap-management",
    title: "Industrial scrap management",
    icon: Factory,
    summary: "Collection, transport, sorting and compliant disposal for factories and manufacturing units.",
    lead: "For factories and manufacturing units we handle industrial waste from start to finish: collection, transport, sorting and compliant disposal. We collect in bulk and keep the paperwork your compliance team needs.",
    accepts: [
      { name: "Metal scrap", detail: "Offcuts, pipes, machinery parts and structural steel" },
      { name: "Electrical and electronic scrap", detail: "Panels, cables, motors and control equipment" },
      { name: "Plastic scrap", detail: "Packaging, moulding rejects and crates" },
      { name: "Hazardous waste", detail: "Accepted only after we confirm what it contains" },
    ],
    workflow: [
      { title: "Bulk pickup", caption: "We schedule bulk collection from your plant.", photo: photos.process },
      { title: "Sorting", caption: "Scrap is sorted by material at our yard.", photo: library.craneScrap },
      { title: "Segregated stock", caption: "Each material goes to its own recovery route.", photo: library.metalTubes },
      { title: "Records", caption: "Weights and disposal routes are documented.", photo: library.paperwork },
    ],
    receives: [certificate, complianceReport, eprSupport],
    faq: [
      {
        q: "Do you handle hazardous industrial waste?",
        a: "Hazardous industrial waste is covered by the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016. Tell us what your waste contains so we can confirm what we can accept before we schedule a pickup.",
      },
      {
        q: "Can you collect in bulk from a factory?",
        a: "Yes. We collect in bulk, transport the scrap to our plant in Sitapur and keep the paperwork your compliance team needs. Pickup is available from client locations anywhere in India.",
      },
      {
        q: "What documents do we receive?",
        a: "You receive a recycling certificate with the weight and a material breakdown, and a disposal compliance report that is ready for audits and for CSR and ESG reporting.",
      },
      {
        q: "How quickly can you respond?",
        a: "Send the type of scrap, the approximate quantity and the location. We reply within 24 hours.",
      },
    ],
    related: ["metal-recovery", "plastic-recycling"],
    sources: [],
    metaTitle: "Industrial Scrap Management in Sitapur, UP | Bulk Pickup",
    metaDescription:
      "Industrial scrap collection, transport, sorting and compliant disposal for factories in Sitapur, UP and across India, with bulk pickup and audit-ready records.",
  },
  {
    slug: "secure-disposal",
    title: "Secure disposal",
    icon: ShieldCheck,
    summary: "Destruction of hard drives, IT assets and confidential documents, with certificates.",
    lead: "We destroy hard drives, IT assets and confidential documents. You receive full chain-of-custody records and a certificate of destruction.",
    definition: {
      term: "Chain of custody",
      text: "Chain of custody is the signed record of who held each item, and when, from collection to destruction.",
    },
    accepts: [
      { name: "Hard drives", detail: "HDDs, SSDs and storage arrays" },
      { name: "IT assets", detail: "Laptops, desktops, servers and phones that hold data" },
      { name: "Confidential documents", detail: "Paper records and files" },
    ],
    workflow: [
      { title: "Collection under custody", caption: "Items are listed and sealed at pickup.", photo: library.paperwork },
      { title: "Destruction", caption: "Drives and media are physically destroyed.", photo: library.hddBroken },
      { title: "Certificate", caption: "A certificate of destruction closes the record.", photo: photos.certs },
    ],
    receives: ["A certificate of destruction", "Full chain-of-custody records", complianceReport],
    faq: [
      {
        q: "How do I prove that data was destroyed?",
        a: "You receive a certificate of destruction and full chain-of-custody records for every item we collect. Retired drives and devices can still hold readable data, so physical destruction, backed by records, gives you proof that the data cannot be recovered.",
      },
      {
        q: "Which items can you destroy?",
        a: "Hard drives, IT assets such as laptops, desktops, servers and phones, and confidential paper documents.",
      },
      {
        q: "Are the records ready for an audit?",
        a: "Yes. The certificate of destruction and the chain-of-custody records list what was collected and destroyed, and you also receive a disposal compliance report for audits and for CSR and ESG reporting.",
      },
      {
        q: "Do you collect from outside Uttar Pradesh?",
        a: "Yes. We pick up from client locations anywhere in India, with chain-of-custody records from the moment of collection.",
      },
    ],
    related: ["e-waste-recycling", "metal-recovery"],
    sources: [],
    metaTitle: "Secure Data and IT Asset Disposal in Sitapur, UP",
    metaDescription:
      "Secure destruction of hard drives, IT assets and documents in Sitapur, UP, with chain-of-custody records, a destruction certificate and PAN India pickup.",
  },
];

export const getService = (slug: string) => services.find(s => s.slug === slug);
