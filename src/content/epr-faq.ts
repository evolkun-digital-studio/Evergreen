/**
 * FAQ under the EPR calculator (also emitted as FAQPage JSON-LD). Figures come from the
 * extracted data in src/data/epr/, so the answers stay in step with the calculator.
 */
import { eprData } from "@/lib/epr/data";

const iii = eprData.targets.scheduleIII
  .map(r => `${r.percent}% ${r.toYear === null ? `from ${r.fromYear}` : r.toYear === r.fromYear ? `in ${r.fromYear}` : `in ${r.fromYear} and ${r.toYear}`}`)
  .join(", ");
const iv = eprData.targets.scheduleIV
  .map(r => (r.baseYear ? `${r.percent}% of ${r.baseYear} sales for ${r.filingYear}` : `${r.percent}% of sales two years back from ${r.filingYear}`))
  .join(", ");
const gold = eprData.goldPhaseIn.map(g => `${g.percent}% in ${g.filingYear}`).join(", ");
const draftCodes = new Set(eprData.items.filter(i => i.averageLifeStatus === "draft").map(i => i.code)).size;
const finalCodes = new Set(eprData.items.map(i => i.code)).size - draftCodes;

export const eprFaq: { q: string; a: string }[] = [
  {
    q: "What is EPR for e-waste?",
    a: "Extended Producer Responsibility (EPR) is a producer's duty to make sure the electronics it sells are recycled at end of life. Under the E-Waste (Management) Rules, 2022, producers register and file returns on CPCB's E-Waste EPR portal (eprewaste.cpcb.gov.in) and meet annual recycling targets by buying EPR certificates that registered recyclers generate on the portal. Treat the portal's figures as final; this calculator is a planning estimate.",
  },
  {
    q: "What does “average life” mean?",
    a: `It is CPCB's estimate of how many years an item stays in use before it becomes e-waste. Under Schedule III, this year's target is based on what you placed on the market one average life ago. For an air-conditioner with a 10-year life, the 2025-26 target uses 2015-16 sales. This calculator uses CPCB's 2016 guideline values for the ${finalCodes} original items and CPCB's March 2023 draft list for the ${draftCodes} items added in 2022.`,
  },
  {
    q: "When does Schedule III apply, and when Schedule IV?",
    a: `Schedule IV is for producers who started selling recently, so their years of sales operations are fewer than the item's average life. Their target is ${iv}. Once the years of sales operations equal the average life, Schedule III applies: ${iii}, of the quantity placed on the market in the target year.`,
  },
  {
    q: "How are the metal obligations worked out?",
    a: `EPR certificates are generated against key metals recovered from e-waste. CPCB's notice of 21 September 2023 gives each item's average share of gold, copper, iron and aluminium by weight. The obligation for each metal is the recycling target multiplied by that share. Copper, iron and aluminium count in full. Gold is phased in: ${gold}, and it stays at 100% after that.`,
  },
  {
    q: "Does the calculator cover imported used EEE and solar panels?",
    a: `Not as a calculation. Importers of used electrical and electronic equipment have a ${eprData.targets.importedUsedEeePercent}% obligation for the quantity imported, if it is not re-exported (Schedule III, note 2). No recycling target applies to waste from solar photovoltaic panels, cells or modules.`,
  },
];
