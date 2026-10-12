/**
 * The entity block (GEO): one set of facts, in one wording, used on Home, About and Contact,
 * in /llms.txt and in the Organization JSON-LD. Change the wording here, nowhere else.
 */
import { fullAddress, isSet, publicPhone, site, telHref } from "@/config/site";
import { capacity, capacitySentence, formatTonnes } from "@/content/stats";

const owner = `${site.owner.honorific} ${site.owner.name}`;
const bc = site.businessContact;

export const entity = {
  /** One-paragraph company summary. */
  summary: `${site.legalName} is an authorised recycler of e-waste, batteries and plastics in ${site.plantLocation}, India, founded in ${site.founded}. It collects from client locations anywhere in India and supports producers with EPR obligations and CPCB compliance.`,
  /** Services in one line. */
  whatWeDo:
    "E-waste, battery and plastic recycling, metal recovery, industrial scrap management and secure disposal, with recycling certificates, EPR obligation fulfilment and CPCB compliance support.",
  authorisations: "Authorised by UPPCB under the E-Waste (Management) Rules, 2022. Battery waste authorisation under the Battery Waste Management Rules. GST and MSME (Udyam) registered.",
  /** Fact sheet in three groups. `lines` renders one value per line (capacity). Same wording as before. */
  groups: [
    {
      label: "Company",
      rows: [
        { label: "Legal name", value: site.legalName },
        { label: "What we do", value: "E-waste, battery and plastic recycling, metal recovery, industrial scrap and secure disposal" },
        { label: "Founded", value: site.founded },
        { label: "Owner", value: owner },
      ],
    },
    {
      label: "Operations",
      rows: [
        { label: "Plant", value: `${fullAddress()}, India` },
        {
          label: "Annual processing capacity",
          value: capacity.map(c => `${c.material} ${formatTonnes(c.tonnes)}`).join(" · "),
          lines: capacity.map(c => `${c.material} ${formatTonnes(c.tonnes)}`),
        },
        { label: "Pickup", value: "PAN India, from client locations" },
        { label: "Authorisations", value: "UPPCB authorised (E-Waste Rules, 2022) · Battery waste authorisation" },
        { label: "GSTIN", value: site.gstin },
      ],
    },
    {
      label: "Contact",
      rows: [
        ...(publicPhone ? [{ label: "Phone", value: publicPhone, href: telHref(publicPhone) }] : []),
        {
          label: "Business enquiries",
          value: `${bc.honorific} ${bc.name}${isSet(bc.title) ? `, ${bc.title}` : ""}, ${bc.phone}`,
          href: telHref(bc.phone),
        },
        { label: "Email", value: site.email, href: `mailto:${site.email}?subject=${encodeURIComponent("Enquiry from evergreenrecycler.in")}` },
      ],
    },
  ] as { label: string; rows: { label: string; value: string; href?: string; lines?: string[] }[] }[],
  capacity: capacitySentence(),
};
