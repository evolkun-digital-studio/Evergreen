"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Download, Link2, RotateCcw } from "lucide-react";
import { EeeCombobox } from "./EeeCombobox";
import {
  FIRST_FILING_YEAR,
  FIRST_SALES_YEAR,
  LAST_FILING_YEAR,
  calculate,
  quantityYearFor,
  type CalcInput,
  type CalcResult,
} from "@/lib/epr/calculate";
import { eprData, itemLabel } from "@/lib/epr/data";
import { fyOf, fyRange, parseFy } from "@/lib/epr/fy";
import { buildSummary, fmtKg, scheduleLine, summaryText } from "@/lib/epr/summary";
import { cn } from "@/lib/utils";
import { FontSafe } from "@/components/FontSafe";

type Target = Extract<CalcResult, { kind: "target" }>;

const EMPTY: CalcInput = { filingYear: "", eeeId: "", salesStartYear: "", quantityKg: "" };
const PARAMS: Record<keyof CalcInput, string> = { filingYear: "fy", eeeId: "eee", salesStartYear: "start", quantityKg: "kg" };
const filingYears = fyRange(FIRST_FILING_YEAR, LAST_FILING_YEAR);

function defaultFilingYear() {
  const y = parseFy(fyOf(new Date()))!;
  return filingYears.find(f => parseFy(f) === Math.min(Math.max(y, FIRST_FILING_YEAR), LAST_FILING_YEAR))!;
}

// At four columns, labels reserve two lines so the fields line up.
const labelClass = "mb-1.5 block text-[14px] font-semibold leading-snug text-ink xl:flex xl:min-h-[2.75em] xl:items-end";
const helpClass = "mt-1.5 text-[13px] leading-snug text-ink-muted";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-[13px] font-medium leading-snug text-destructive">
      {message}
    </p>
  ) : null;
}

export function EprCalculator() {
  const uid = useId();
  const ids = { fy: `${uid}-fy`, eee: `${uid}-eee`, start: `${uid}-start`, kg: `${uid}-kg` };
  const [input, setInput] = useState<CalcInput>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof CalcInput, boolean>>>({});
  const [status, setStatus] = useState("");
  const ready = useRef(false);

  // Restore a shared link, else default to the current financial year. Runs after hydration so
  // the page itself stays fully static.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const restored = Object.fromEntries(
      (Object.keys(PARAMS) as (keyof CalcInput)[]).map(k => [k, q.get(PARAMS[k])?.slice(0, 40) ?? ""]),
    ) as CalcInput;
    restored.filingYear ||= defaultFilingYear();
    // One-off sync from the URL after hydration (reading it during render would break the static HTML).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInput(restored);
    if (q.size) setTouched({ filingYear: true, eeeId: true, salesStartYear: true, quantityKg: true });
    ready.current = true;
  }, []);

  // Keep the URL in step with the inputs so it can be shared or bookmarked.
  useEffect(() => {
    if (!ready.current) return;
    const q = new URLSearchParams();
    for (const k of Object.keys(PARAMS) as (keyof CalcInput)[]) if (input[k]) q.set(PARAMS[k], input[k]);
    const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [input]);

  const result = useMemo(() => calculate(input, eprData), [input]);
  const errors = result.kind === "invalid" ? result.errors : {};
  const shown = (k: keyof CalcInput) => (touched[k] || input[k] !== "") && errors[k] ? errors[k] : undefined;
  const qYear = quantityYearFor(input, eprData);
  const salesYears = useMemo(() => fyRange(FIRST_SALES_YEAR, parseFy(input.filingYear) ?? LAST_FILING_YEAR), [input.filingYear]);
  const set = (k: keyof CalcInput) => (v: string) => {
    setInput(prev => ({ ...prev, [k]: v }));
    setStatus("");
  };
  const blur = (k: keyof CalcInput) => () => setTouched(t => ({ ...t, [k]: true }));

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
    const { downloadPdf } = await import("./pdf");
    await downloadPdf(input, target, shareUrl());
    setStatus("PDF downloaded.");
  }
  function reset() {
    setInput({ ...EMPTY, filingYear: defaultFilingYear() });
    setTouched({});
    setStatus("Calculator reset.");
  }

  const contactHref = target
    ? `/contact?${new URLSearchParams({
        service: "E-waste recycling",
        message: `EPR certificates enquiry for ${target.item.code} (${itemLabel(target.item)}). Filing year ${input.filingYear}; estimated recycling target ${fmtKg(target.targetKg)} kg.`,
      })}`
    : "/contact";

  return (
    <div className="space-y-10">
      <form
        noValidate
        onSubmit={e => e.preventDefault()}
        aria-label="EPR calculator inputs"
        className="grid gap-6 rounded-xl border border-line bg-paper p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-4"
      >
        <div>
          <label htmlFor={ids.fy} className={labelClass}>
            E-waste annual filing year
          </label>
          <select
            id={ids.fy}
            className="field h-[50px]"
            value={input.filingYear}
            onChange={e => set("filingYear")(e.target.value)}
            onBlur={blur("filingYear")}
            aria-invalid={!!shown("filingYear") || undefined}
            aria-describedby={shown("filingYear") ? `${ids.fy}-err` : undefined}
          >
            {!input.filingYear && <option value="">Select a year</option>}
            {filingYears.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <FieldError id={`${ids.fy}-err`} message={shown("filingYear")} />
        </div>

        <div>
          <label htmlFor={ids.eee} className={labelClass}>
            Electrical and electronic equipment (EEE)
          </label>
          <EeeCombobox
            id={ids.eee}
            items={eprData.items}
            value={input.eeeId}
            onChange={v => {
              set("eeeId")(v);
              setTouched(t => ({ ...t, eeeId: true }));
            }}
            invalid={!!shown("eeeId")}
            describedBy={shown("eeeId") ? `${ids.eee}-err` : undefined}
          />
          <FieldError id={`${ids.eee}-err`} message={shown("eeeId")} />
        </div>

        <div>
          <label htmlFor={ids.start} className={labelClass}>
            Sales started in
          </label>
          <select
            id={ids.start}
            className="field h-[50px]"
            value={input.salesStartYear}
            onChange={e => set("salesStartYear")(e.target.value)}
            onBlur={blur("salesStartYear")}
            aria-invalid={!!shown("salesStartYear") || undefined}
            aria-describedby={shown("salesStartYear") ? `${ids.start}-err` : undefined}
          >
            <option value="">Select a year</option>
            {/* Keep an out-of-range choice visible so its error can be read. */}
            {input.salesStartYear && !salesYears.includes(input.salesStartYear) && <option value={input.salesStartYear}>{input.salesStartYear}</option>}
            {salesYears.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <FieldError id={`${ids.start}-err`} message={shown("salesStartYear")} />
        </div>

        <div>
          <label htmlFor={ids.kg} className={labelClass}>
            {qYear?.schedule === "IV" ? `Sales in ${qYear.year} (kg)` : "EEE placed on the market in target year (kg)"}
          </label>
          <input
            id={ids.kg}
            className="field h-[50px] tabular-nums"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.0000"
            value={input.quantityKg}
            onChange={e => set("quantityKg")(e.target.value.replace(/,/g, ""))}
            onBlur={blur("quantityKg")}
            aria-invalid={!!shown("quantityKg") || undefined}
            aria-describedby={`${ids.kg}-help${shown("quantityKg") ? ` ${ids.kg}-err` : ""}`}
          />
          <p id={`${ids.kg}-help`} className={helpClass}>
            {qYear ? (qYear.schedule === "III" ? `For ${qYear.year}. Up to 4 decimals.` : `Schedule IV base year. Up to 4 decimals.`) : "Up to 4 decimals."}
          </p>
          <FieldError id={`${ids.kg}-err`} message={shown("quantityKg")} />
        </div>
      </form>

      <section aria-labelledby={`${uid}-results`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id={`${uid}-results`} className="text-[1.375rem]">
            Results
          </h2>
          <p className="min-h-[1.5em] text-[15px] font-semibold text-evergreen-700">{target ? scheduleLine(target, input.filingYear) : ""}</p>
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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset
          </button>
          <button type="button" onClick={copy} disabled={!target} className="btn btn-secondary btn-sm disabled:opacity-50">
            <Copy aria-hidden="true" className="h-4 w-4" />
            Copy results
          </button>
          <button type="button" onClick={pdf} disabled={!target} className="btn btn-secondary btn-sm disabled:opacity-50">
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </button>
          <button type="button" onClick={share} className="btn btn-secondary btn-sm">
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Share link
          </button>
          <p role="status" className="col-span-2 min-h-[1.25rem] text-[14px] text-evergreen-700 empty:-mt-3 sm:ml-1 sm:empty:mt-0">
            {status && (
              <span className="inline-flex items-center gap-1.5">
                <Check aria-hidden="true" className="h-4 w-4" />
                {status}
              </span>
            )}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-5 rounded-xl bg-evergreen-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="font-display text-[1.25rem] font-semibold leading-snug text-white">Need EPR certificates for this target?</p>
          <Link href={contactHref} className="btn shrink-0 bg-moss text-evergreen-950 hover:bg-moss-soft">
            Talk to Evergreen
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, main = false, sub }: { label: string; value: string; main?: boolean; sub?: string }) {
  return (
    <div
      className={cn(
        "flex h-[112px] flex-col justify-between rounded-xl border border-line bg-white p-4 sm:h-[124px] sm:p-5",
        main && "order-first col-span-2 border-evergreen-700/30 bg-evergreen-700/[0.04] lg:order-none lg:col-span-1",
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
  const dash = "—";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr_1fr]">
      <Tile label="Years of sales operations" value={r ? String(r.yearsOfSalesOperations) : dash} />
      <Tile
        label="EEE average life (years)"
        value={r ? String(r.averageLife) : result.kind === "not-applicable" ? String(result.item.averageLifeYears) : dash}
        sub={r?.item.averageLifeStatus === "draft" ? "CPCB draft list" : undefined}
      />
      <Tile label={r?.schedule === "IV" ? "Base sales year" : "Target year"} value={r ? r.targetYear : dash} />
      <Tile label="Recycling target (kg)" value={r ? fmtKg(r.targetKg) : result.kind === "not-applicable" ? "Not applicable" : dash} main />
      <Tile label="Filing-year target (kg)" value={r ? fmtKg(r.filingYearTargetKg) : dash} />
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
      <h3 className="border-b border-line px-5 py-4 text-[1.0625rem] leading-snug">Metal recovery (kg)</h3>
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
                <span className="font-semibold tabular-nums text-evergreen-900">{full ? (full.kg ? fmtKg(full.kg) : "–") : "—"}</span>
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
            <col className="w-[20%]" />
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
                  <td className="px-5 text-right font-semibold text-evergreen-900">{full ? (full.kg ? fmtKg(full.kg) : "–") : "—"}</td>
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
  const pct = (p: number) => `${p}%`;
  return (
    <details className="group mt-3 rounded-xl border border-line bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 font-display text-[15px] font-semibold text-evergreen-700 [&::-webkit-details-marker]:hidden">
        <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>{" "}
        How this was calculated
      </summary>
      <ol className="space-y-2 border-t border-line px-5 py-4 text-[15px] leading-relaxed tabular-nums">
        <li>
          Years of sales operations: {input.salesStartYear} to {input.filingYear}, counted inclusively = <strong>{r.yearsOfSalesOperations}</strong>.
        </li>
        <li>
          {r.schedule === "III"
            ? `${r.yearsOfSalesOperations} ≥ average life ${r.averageLife}, so Schedule III applies. Target year = ${input.filingYear} − ${r.averageLife} years = `
            : `${r.yearsOfSalesOperations} < average life ${r.averageLife}, so Schedule IV applies. Base sales year for ${input.filingYear} = `}
          <strong>{r.targetYear}</strong>.
        </li>
        <li>
          Recycling target = {fmtKg(r.quantityKg)} kg × {pct(r.targetPercent)} = <strong>{fmtKg(r.targetKg)} kg</strong>
          {r.schedule === "III" ? "; the filing-year target is 0." : ", which is also the filing-year target."}
        </li>
        {r.metals.map(m => (
          <li key={m.key}>
            {m.name}: {m.compositionPercent === null ? "no composition given in Annexure I (–)." : (
              <>
                {fmtKg(r.targetKg)} kg × {m.compositionPercent}% × {pct(m.phaseInPercent)} phase-in = <strong>{fmtKg(m.kg!)} kg</strong>
              </>
            )}
          </li>
        ))}
        <li className="text-ink-muted">Values are exact to the last digit; results are rounded half-up to 4 decimal places.</li>
      </ol>
    </details>
  );
}
