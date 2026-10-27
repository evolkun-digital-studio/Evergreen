"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, Info, Link2, RotateCcw } from "lucide-react";
import { EeeCombobox } from "./EeeCombobox";
import {
  FIRST_FILING_YEAR,
  FIRST_SALES_YEAR,
  LAST_FILING_YEAR,
  calculate,
  explain,
  plan,
  quantityFieldFor,
  scheduleName,
  type CalcInput,
  type CalcResult,
  type ProducerType,
  type Target,
} from "@/lib/epr/calculate";
import { eprData, itemLabel, regulatoryStatus } from "@/lib/epr/data";
import { fyOf, fyRange, parseFy } from "@/lib/epr/fy";
import { TRANSPARENCY, buildSummary, fmtKg, fmtMetalKg, scheduleLine, summaryText } from "@/lib/epr/summary";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FontSafe } from "@/components/FontSafe";
import { EprLeadForm } from "./EprLeadForm";

/** Everything except the quantity, which is stored per financial year (see `quantities`). */
type Fields = Pick<CalcInput, "filingYear" | "eeeId" | "salesStartYear"> & { producerType: ProducerType };
type FieldKey = keyof Fields | "quantityKg";

const EMPTY: Fields = { filingYear: "", eeeId: "", salesStartYear: "", producerType: "producer" };
const PARAMS: Record<keyof Fields, string> = { filingYear: "fy", eeeId: "eee", salesStartYear: "start", producerType: "type" };
const filingYears = fyRange(FIRST_FILING_YEAR, LAST_FILING_YEAR);

function defaultFilingYear() {
  const y = parseFy(fyOf(new Date()))!;
  return filingYears.find(f => parseFy(f) === Math.min(Math.max(y, FIRST_FILING_YEAR), LAST_FILING_YEAR))!;
}

const labelClass = "mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold leading-snug text-ink";
const helpClass = "mt-1.5 text-[13px] leading-snug text-ink-muted";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-[13px] font-medium leading-snug text-destructive">
      {message}
    </p>
  ) : null;
}

/** A small (i) button that explains a field. A popover, not a tooltip, so it also opens on tap. */
function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="grid h-6 w-6 place-items-center rounded-full text-ink-muted hover:text-evergreen-700 active:transform-none">
          <Info aria-hidden="true" className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" collisionPadding={16} className="w-72 border-line p-3 text-[13px] font-normal leading-snug text-ink">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function EprCalculator() {
  const uid = useId();
  const ids = { fy: `${uid}-fy`, type: `${uid}-type`, eee: `${uid}-eee`, start: `${uid}-start`, kg: `${uid}-kg` };
  const [fields, setFields] = useState<Fields>(EMPTY);
  /** Quantities keyed by the financial year they were entered for, so a figure never moves to another year. */
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [status, setStatus] = useState("");
  /** Set once the URL has been read into state; the URL is not written before then, or it would wipe a shared link. */
  const [restored, setRestored] = useState(false);

  // Restore a shared link, else default to the current financial year. Runs after hydration so
  // the page itself stays fully static.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const get = (k: string) => q.get(k)?.slice(0, 40) ?? "";
    const restored: Fields = {
      filingYear: get(PARAMS.filingYear) || defaultFilingYear(),
      eeeId: get(PARAMS.eeeId),
      salesStartYear: get(PARAMS.salesStartYear),
      producerType: get(PARAMS.producerType) === "used" ? "used-importer" : "producer",
    };
    // Older links carry no quantity year: attach the quantity to the year these inputs need.
    const kg = get("kg");
    const year = get("ky") || quantityFieldFor(plan({ ...restored, quantityKg: "" }, eprData))?.year;
    // One-off sync from the URL after hydration (reading it during render would break the static HTML).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields(restored);
    if (kg && year) setQuantities({ [year]: kg });
    if (q.size) setTouched({ filingYear: true, eeeId: true, salesStartYear: true, producerType: true, quantityKg: true });
    setRestored(true);
  }, []);

  const planned = useMemo(() => plan({ ...fields, quantityKg: "" }, eprData), [fields]);
  const qField = quantityFieldFor(planned);
  const quantityKg = qField && !qField.disabled ? (quantities[qField.year] ?? "") : "";
  const input: CalcInput = { ...fields, quantityKg, quantityYear: qField?.year };
  const result = useMemo(() => calculate({ ...fields, quantityKg, quantityYear: qField?.year }, eprData), [fields, quantityKg, qField?.year]);

  // Keep the URL in step with the inputs so it can be shared or bookmarked.
  useEffect(() => {
    if (!restored) return;
    const q = new URLSearchParams();
    if (fields.filingYear) q.set(PARAMS.filingYear, fields.filingYear);
    if (fields.producerType === "used-importer") q.set(PARAMS.producerType, "used");
    if (fields.eeeId) q.set(PARAMS.eeeId, fields.eeeId);
    if (fields.salesStartYear && fields.producerType === "producer") q.set(PARAMS.salesStartYear, fields.salesStartYear);
    if (quantityKg && qField) {
      q.set("kg", quantityKg);
      q.set("ky", qField.year);
    }
    const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [restored, fields, quantityKg, qField]);

  const errors = result.kind === "invalid" ? result.errors : {};
  const shown = (k: FieldKey) => {
    const filled = k === "quantityKg" ? quantityKg !== "" : fields[k] !== "";
    return (touched[k] || filled) && errors[k] ? errors[k] : undefined;
  };
  const salesYears = useMemo(() => fyRange(FIRST_SALES_YEAR, parseFy(fields.filingYear) ?? LAST_FILING_YEAR), [fields.filingYear]);
  const set = (k: keyof Fields) => (v: string) => {
    setFields(prev => ({ ...prev, [k]: v }));
    setStatus("");
  };
  const setQuantity = (v: string) => {
    if (!qField) return;
    setQuantities(prev => ({ ...prev, [qField.year]: v }));
    setStatus("");
  };
  const blur = (k: FieldKey) => () => setTouched(t => ({ ...t, [k]: true }));

  const target = result.kind === "target" ? result : null;
  const shareUrl = () => window.location.href;

  async function copy() {
    if (!target) return;
    await navigator.clipboard.writeText(summaryText(buildSummary(input, target), eprData, shareUrl()));
    setStatus("Results copied.");
  }
  async function share() {
    await navigator.clipboard.writeText(shareUrl());
    setStatus("Link copied. It opens the calculator with these inputs.");
  }
  async function pdf() {
    if (!target) return;
    setStatus("Preparing PDF…");
    try {
      const { downloadPdf } = await import("./pdf");
      await downloadPdf(input, target, shareUrl());
      setStatus("PDF downloaded.");
    } catch {
      setStatus("PDF could not be created. Please try again.");
    }
  }
  function reset() {
    setFields({ ...EMPTY, filingYear: defaultFilingYear() });
    setQuantities({});
    setTouched({});
    setStatus("Calculator reset.");
  }

  const contactHref = target
    ? `/contact?${new URLSearchParams({
        service: "E-waste recycling",
        message: `EPR certificates enquiry for ${target.item.code} (${itemLabel(target.item)}). Filing year ${target.filingYear}; estimated recycling target ${fmtKg(target.targetKg)} kg.`,
      })}`
    : "/contact";

  const isProducer = fields.producerType === "producer";
  const quantityHelp = !qField
    ? isProducer
      ? "Choose the filing year, EEE item and sales start year first."
      : "Choose the filing year and EEE item first."
    : qField.disabled
      ? "No sales recorded for this financial year."
      : planned.kind === "plan" && planned.schedule === "III"
        ? `Schedule III reference year (Y − X). Up to 4 decimals.`
        : planned.kind === "plan" && planned.schedule === "IV"
          ? `Schedule IV reference sales year. Up to 4 decimals.`
          : "Up to 4 decimals.";

  return (
    <div className="flex flex-col gap-6 xl:gap-8">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(19rem,0.72fr)_minmax(0,1.28fr)] xl:gap-8">
      <form
        noValidate
        onSubmit={e => e.preventDefault()}
        aria-labelledby={`${uid}-inputs`}
        className="overflow-hidden rounded-xl border border-line bg-paper xl:sticky xl:top-24"
      >
        <div className="border-b border-line bg-white px-5 py-5 sm:px-6">
          <p className="eyebrow">Calculator inputs</p>
          <h2 id={`${uid}-inputs`} className="mt-2 text-[1.375rem]">
            Enter your EEE sales details
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">Your estimate updates automatically as you complete the fields.</p>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-1">
          <div className="min-w-0">
            <div className={labelClass}>
              <label htmlFor={ids.fy}>E-waste annual filing year</label>
              <InfoTip label="About the filing year">
                The financial year (April to March) you file your EPR annual return for and must meet the recycling target in.
              </InfoTip>
            </div>
            <select
              id={ids.fy}
              className="field h-[50px]"
              value={fields.filingYear}
              onChange={e => set("filingYear")(e.target.value)}
              onBlur={blur("filingYear")}
              aria-invalid={!!shown("filingYear") || undefined}
              aria-describedby={shown("filingYear") ? `${ids.fy}-err` : undefined}
            >
              {!fields.filingYear && <option value="">Select a year</option>}
              {filingYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <FieldError id={`${ids.fy}-err`} message={shown("filingYear")} />
          </div>

          <div className="min-w-0">
            <label htmlFor={ids.type} className={labelClass}>
              Producer type
            </label>
            <select
              id={ids.type}
              className="field h-[50px]"
              value={fields.producerType}
              onChange={e => set("producerType")(e.target.value)}
              aria-describedby={`${ids.type}-help`}
            >
              <option value="producer">Producer of new EEE</option>
              <option value="used-importer">Importer of used EEE</option>
            </select>
            <p id={`${ids.type}-help`} className={helpClass}>
              {isProducer ? "Manufacturer, brand owner or importer of new EEE. Schedule III or IV is chosen automatically." : "100% obligation after end of life, if not re-exported (Schedule III note 2)."}
            </p>
          </div>

          <div className="min-w-0">
          <label htmlFor={ids.eee} className={labelClass}>
            Electrical and electronic equipment (EEE)
          </label>
          <EeeCombobox
            id={ids.eee}
            items={eprData.items}
            value={fields.eeeId}
            onChange={v => {
              set("eeeId")(v);
              setTouched(t => ({ ...t, eeeId: true }));
            }}
            invalid={!!shown("eeeId")}
            describedBy={shown("eeeId") ? `${ids.eee}-err` : undefined}
          />
          <FieldError id={`${ids.eee}-err`} message={shown("eeeId")} />
          </div>

          {isProducer && (
          <div className="min-w-0">
          <div className={labelClass}>
            <label htmlFor={ids.start}>Sales started in</label>
            <InfoTip label="About the sales start year">
              The financial year you first placed this EEE item on the Indian market. Years of sales operations, counted from here to the filing year, decide whether Schedule IV (recent sales) or Schedule III applies.
            </InfoTip>
          </div>
          <select
            id={ids.start}
            className="field h-[50px]"
            value={fields.salesStartYear}
            onChange={e => set("salesStartYear")(e.target.value)}
            onBlur={blur("salesStartYear")}
            aria-invalid={!!shown("salesStartYear") || undefined}
            aria-describedby={shown("salesStartYear") ? `${ids.start}-err` : undefined}
          >
            <option value="">Select a year</option>
            {/* Keep an out-of-range choice visible so its error can be read. */}
            {fields.salesStartYear && !salesYears.includes(fields.salesStartYear) && <option value={fields.salesStartYear}>{fields.salesStartYear}</option>}
            {salesYears.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <FieldError id={`${ids.start}-err`} message={shown("salesStartYear")} />
          </div>
          )}

          <div className="min-w-0">
          <div className={labelClass}>
            <label htmlFor={ids.kg}>{qField?.label ?? "Sales in reference year (kg)"}</label>
            <InfoTip label="About the reference sales year">
              The reference sales year is the year whose quantity your target is based on. Under Schedule III it is the filing year minus the item&rsquo;s average life (Y − X); under Schedule IV it is two years before the filing year (fixed years for 2023-24 and 2024-25). It is worked out for you.
            </InfoTip>
          </div>
          <input
            id={ids.kg}
            className="field h-[50px] tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
            inputMode="decimal"
            autoComplete="off"
            placeholder={qField?.disabled ? "0" : "0.0000"}
            disabled={!qField || qField.disabled}
            value={quantityKg}
            onChange={e => setQuantity(e.target.value.replace(/,/g, ""))}
            onBlur={blur("quantityKg")}
            aria-invalid={!!shown("quantityKg") || undefined}
            aria-describedby={`${ids.kg}-help${shown("quantityKg") ? ` ${ids.kg}-err` : ""}`}
          />
          <p id={`${ids.kg}-help`} className={cn(helpClass, qField?.disabled && "font-medium text-ink")}>
            {quantityHelp}
          </p>
          <FieldError id={`${ids.kg}-err`} message={shown("quantityKg")} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper-2 px-5 py-4 sm:px-6">
          <p className="text-[13px] text-ink-muted">Enter all quantities in kilograms.</p>
          <button type="button" onClick={reset} className="btn btn-secondary btn-sm bg-white">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>

      <section aria-labelledby={`${uid}-results`} className="min-w-0 rounded-xl border border-line bg-paper p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Your estimate</p>
            <h2 id={`${uid}-results`} className="mt-2 text-[1.5rem]">
              Estimated EPR obligations
            </h2>
          </div>
          <p className="min-h-[1.75rem] rounded-full bg-evergreen-700/[0.08] px-3 py-1 text-[13px] font-semibold text-evergreen-700">
            {target ? scheduleLine(target) : "Complete the inputs to calculate"}
          </p>
        </div>
        <div aria-live="polite" aria-atomic="false" className="mt-5">
          <ResultTiles result={result} />
          {result.kind === "not-applicable" && (
            <p className="mt-4 rounded-lg border border-line bg-white px-4 py-3 text-[15px]">{result.reason}</p>
          )}
          {target && target.notes.length > 0 && (
            <ul className="mt-4 space-y-1 text-[14px] leading-snug text-ink-muted">
              {target.notes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <MetalTable result={target} />
          {target && <HowCalculated input={input} r={target} />}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={pdf} disabled={!target} className="btn btn-primary btn-sm disabled:opacity-50">
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </button>
          <button type="button" onClick={copy} disabled={!target} className="btn btn-secondary btn-sm disabled:opacity-50">
            <Copy aria-hidden="true" className="h-4 w-4" />
            Copy results
          </button>
          <button type="button" onClick={share} className="btn btn-secondary btn-sm">
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Share link
          </button>
          <p role="status" className="min-h-[1.25rem] text-[14px] text-evergreen-700 empty:-mt-3 sm:col-span-3 sm:empty:mt-0">
            {status && (
              <span className="inline-flex items-center gap-1.5">
                <Check aria-hidden="true" className="h-4 w-4" />
                {status}
              </span>
            )}
          </p>
        </div>
      </section>
    </div>

      <RegulatoryInfo schedule={target ? scheduleName(target.schedule) : null} />

      <div className="flex flex-col gap-5 rounded-xl bg-evergreen-950 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-display text-[1.25rem] font-semibold leading-snug text-white">Need EPR certificates for this target?</p><Link href={contactHref} className="text-sm font-semibold text-moss-soft underline">Use the full contact form <ArrowRight aria-hidden="true" className="inline h-4 w-4" /></Link></div>
        {target && <EprLeadForm snapshot={{ filingYear: target.filingYear, eeeId: target.item.id, salesStartYear: fields.salesStartYear, quantityKg: target.quantityKg.toString(), targetKg: target.targetKg.toString() }} />}
      </div>
    </div>
  );
}

function Tile({ label, value, main = false, sub }: { label: string; value: string; main?: boolean; sub?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] flex-col justify-between rounded-xl border border-line bg-white p-4 sm:min-h-[124px] sm:p-5",
        main && "order-first col-span-2 min-h-[148px] border-evergreen-700/30 bg-evergreen-700/[0.05] sm:min-h-[156px]",
      )}
    >
      <p className="text-[13px] font-medium leading-snug text-ink-muted">{label}</p>
      <div className="flex min-h-[2.25rem] flex-col justify-end">
        <p className={cn("font-display font-medium leading-none tabular-nums text-evergreen-900", main ? "text-[2rem] sm:text-[2.25rem]" : "text-[1.5rem]")}>
          <FontSafe>{value}</FontSafe>
        </p>
        {sub && <p className="mt-1 text-[12px] text-ink-muted">{sub}</p>}
      </div>
    </div>
  );
}

function ResultTiles({ result }: { result: CalcResult }) {
  const r = result.kind === "target" ? result : null;
  const na = result.kind === "not-applicable";
  const dash = "—";
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        label="Estimated recycling target (kg)"
        value={r ? fmtKg(r.targetKg) : na ? "Not applicable" : dash}
        sub={r ? "Estimate only, not an official CPCB assessment" : undefined}
        main
      />
      <Tile label="Applicable schedule" value={r ? (r.schedule === "used-import" ? "Used EEE" : r.schedule) : dash} sub={r?.schedule === "used-import" ? "Schedule III note 2" : undefined} />
      <Tile label="Applicable target percentage" value={r ? `${r.targetPercent}%` : dash} />
      <Tile label="Filing year" value={r ? r.filingYear : dash} />
      <Tile
        label="Reference sales year"
        value={r ? r.referenceYear : dash}
        sub={r && !r.salesInReferenceYear ? "No sales recorded for this financial year" : undefined}
      />
      <Tile label="Years of sales operations" value={r ? (r.yearsOfSalesOperations === null ? "Not used" : String(r.yearsOfSalesOperations)) : dash} />
      <Tile
        label="EEE average life (years)"
        value={r ? String(r.averageLife) : na ? String(result.item.averageLifeYears) : dash}
        sub={(r?.item ?? (na ? result.item : null))?.averageLifeStatus === "draft" ? "CPCB draft list" : undefined}
      />
    </div>
  );
}

function MetalTable({ result }: { result: Target | null }) {
  const rows = result?.metals ?? [
    { key: "au", name: "Gold", symbol: "Au" },
    { key: "cu", name: "Copper", symbol: "Cu" },
    { key: "fe", name: "Iron", symbol: "Fe" },
    { key: "al", name: "Aluminium", symbol: "Al" },
  ];
  return (
    <div className="mt-3 rounded-xl border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-[1.0625rem] leading-snug">Metal recovery (kg)</h3>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">Key metals for EPR certificates, worked out from the recycling target above. They are part of that target, not an additional obligation.</p>
      </div>
      {/* Phones: one row per metal, figures stacked under the name. */}
      <ul className="divide-y divide-line sm:hidden">
        {rows.map(m => {
          const full = "kg" in m ? m : null;
          return (
            <li key={m.key} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">
                  {m.name} ({m.symbol})
                </span>
                <span className="font-semibold tabular-nums text-evergreen-900">{full ? (full.kg ? fmtMetalKg(full.kg) : "–") : "—"}</span>
              </div>
              <dl className="mt-1 flex gap-4 text-[13px] text-ink-muted">
                <div className="flex gap-1">
                  <dt>Composition</dt>
                  <dd className="tabular-nums">{full ? (full.compositionPercent === null ? "–" : `${full.compositionPercent}%`) : "—"}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Phase-in</dt>
                  <dd className="tabular-nums">{full ? `${full.phaseInPercent}%` : "—"}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[600px] table-fixed text-left text-[15px]">
          <colgroup>
            <col />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="whitespace-nowrap text-[13px] text-ink-muted">
              <th scope="col" className="px-5 py-3 font-medium">
                Metal
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Composition (% by weight)
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Phase-in (%)
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Quantity (kg)
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map(m => {
              const full = "kg" in m ? m : null;
              return (
                <tr key={m.key} className="h-12 border-t border-line">
                  <th scope="row" className="whitespace-nowrap px-5 font-medium">
                    {m.name} ({m.symbol})
                  </th>
                  <td className="px-5 text-right">{full ? (full.compositionPercent ?? "–") : "—"}</td>
                  <td className="px-5 text-right">{full ? full.phaseInPercent : "—"}</td>
                  <td className="px-5 text-right font-semibold text-evergreen-900">{full ? (full.kg ? fmtMetalKg(full.kg) : "–") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HowCalculated({ input, r }: { input: CalcInput; r: Target }) {
  const source = (key: string) => eprData.meta.sources.find(s => s.key === key);
  const life = source(r.item.averageLifeSource);
  return (
    <details className="group mt-3 rounded-xl border border-line bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 font-display text-[15px] font-semibold text-evergreen-700 [&::-webkit-details-marker]:hidden">
        <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>{" "}
        How this was calculated
      </summary>
      <ol className="list-decimal space-y-2 border-t border-line py-4 pl-10 pr-5 text-[15px] leading-relaxed tabular-nums">
        {explain(r, input, fmtKg).map(step => (
          <li key={step}>{step}</li>
        ))}
        {r.metals.map(m => (
          <li key={m.key}>
            {m.name}: {m.compositionPercent === null ? "no composition given in Annexure I (–)." : (
              <>
                {fmtKg(r.targetKg)} kg × {m.compositionPercent}% × {m.phaseInPercent}% phase-in = <strong>{fmtMetalKg(m.kg!)} kg</strong>
              </>
            )}
          </li>
        ))}
      </ol>
      <div className="space-y-1 border-t border-line px-5 py-4 text-[13px] leading-snug text-ink-muted">
        <p>
          Targets: {r.schedule === "used-import" ? "Schedule III note (2)" : `Schedule ${r.schedule}`}, E-Waste (Management) Rules, 2022 (G.S.R. 801(E), in force 1 April 2023; Schedules unchanged by later amendments).
        </p>
        {life && <p>Average life: {life.issuer}, {life.title} ({life.date}).</p>}
        <p>Key metals: CPCB, Framework for generation of EPR Certificate, Annexure I and paragraphs 6 and 8 (21 September 2023).</p>
        <p>Values are exact to the last digit; results are rounded half-up for display only.</p>
      </div>
    </details>
  );
}

const fmtDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : d;

const OFFICIAL_LINKS = [
  { href: "https://moef.gov.in/rules-regulations-3", label: "MoEFCC rules and amendments" },
  { href: "https://cpcb.nic.in", label: "Central Pollution Control Board" },
  { href: "https://eprewaste.cpcb.gov.in", label: "CPCB E-Waste EPR portal" },
  { href: "https://egazette.gov.in", label: "Gazette of India" },
];

function RegulatoryInfo({ schedule }: { schedule: string | null }) {
  const amendments = eprData.meta.sources.filter(s => s.key === "rules" || s.key.startsWith("amendment")).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section aria-label="Regulatory basis" className="rounded-xl border border-line bg-white p-5 text-[14px] leading-relaxed sm:p-6">
      <p className="text-ink">{TRANSPARENCY}</p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Regulation version</dt>
          <dd className="font-medium text-ink">{regulatoryStatus.regulation}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Last verified</dt>
          <dd className="font-medium text-ink">{fmtDate(regulatoryStatus.lastVerified)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Applicable schedule</dt>
          <dd className="font-medium text-ink">{schedule ?? "Complete the inputs"}</dd>
        </div>
      </dl>
      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-[13px] font-semibold text-evergreen-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>{" "}
          Amendments, effective dates and sources
        </summary>
        <ul className="mt-3 space-y-1.5 text-[13px] text-ink-muted">
          {amendments.map(a => (
            <li key={a.key}>
              <span className="font-medium text-ink">{a.title}</span>, in force {fmtDate(a.effective ?? a.date)}. {a.usedFor}.
            </li>
          ))}
          <li>{regulatoryStatus.verifiedBy}</li>
          {regulatoryStatus.openItems.map(o => (
            <li key={o}>Open item: {o}</li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {OFFICIAL_LINKS.map(l => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="font-medium text-evergreen-700 underline underline-offset-2">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
