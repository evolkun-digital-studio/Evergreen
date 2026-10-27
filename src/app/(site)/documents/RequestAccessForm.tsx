"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import type { PublicDocumentOption } from "@/lib/data/document-requests";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  type DocumentCategory,
} from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import { submitDocumentRequest } from "./actions";

export const REQUEST_RECEIVED_MESSAGE =
  "Thanks. Admin will respond to you very soon by email.";

/* -------------------------------------------------------------------------- */
/*                                   Tokens                                   */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nothing moves: every control opts out of the global press-scale. */
const still = "active:transform-none";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-700/35 focus-visible:ring-offset-2";

const inputClass =
  "h-11 w-full rounded-[10px] border border-black/[0.08] bg-white px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted/55 focus-visible:border-evergreen-700/50 focus-visible:ring-[3px] focus-visible:ring-evergreen-700/10 aria-[invalid=true]:border-red-500/60";

/** Grid page size: 8 cards (2 rows × 4) on larger screens, 5 list rows on phones. Keeps the page short. */
const PAGE_DESKTOP = 8;
const PAGE_MOBILE = 5;

function useMediaQuery(query: string, serverFallback: boolean) {
  return useSyncExternalStore(
    onChange => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Icons                                   */
/* -------------------------------------------------------------------------- */

function LockIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.75 7V5.25a2.25 2.25 0 0 1 4.5 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="m3.75 8.25 2.75 2.75 5.75-6.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ dir, className }: { dir: "left" | "right"; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d={dir === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Blurred document illustration                      */
/* -------------------------------------------------------------------------- */

function seed(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const PAGE = "M10 3h74l16 16v118a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6Z";
const INK = "#1b2a20";
const GREY = "#8f998f";

/**
 * A drawn page with a folded corner; its contents are blurred so nothing is readable.
 * Each document id always gets the same layout. Accent uses currentColor.
 */
function DocThumb({ id, className }: { id: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const s = seed(id);
  const layout = s % 4;
  const w = (i: number) => 40 + ((s >>> (i * 3)) % 8) * 5;
  const bar = (y: number, width: number, x = 14, k?: number) => (
    <rect key={k ?? y} x={x} y={y} width={width} height="3" rx="1.5" fill={GREY} fillOpacity=".42" />
  );

  return (
    <svg viewBox="0 0 104 146" aria-hidden="true" className={className}>
      <defs>
        <filter id={`${uid}b`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id={`${uid}c`}>
          <path d={PAGE} />
        </clipPath>
      </defs>
      <path d={PAGE} fill="#fff" stroke="#000" strokeOpacity=".08" />
      <g clipPath={`url(#${uid}c)`} filter={`url(#${uid}b)`}>
        {layout !== 1 && (
          <>
            <rect x="14" y="16" width="10" height="10" rx="2.5" fill="currentColor" fillOpacity=".75" />
            <rect x="28" y="17.5" width="30" height="3.6" rx="1.8" fill={INK} fillOpacity=".5" />
            <rect x="28" y="23.5" width="18" height="2.4" rx="1.2" fill={GREY} fillOpacity=".5" />
          </>
        )}
        {layout === 0 && (
          <>
            {[40, 47, 54, 61].map((y, i) => bar(y, w(i) + 12))}
            {[0, 1, 2, 3, 4].map(i => {
              const h = 14 + ((s >>> (i * 4 + 1)) % 6) * 5;
              return (
                <rect key={i} x={18 + i * 14} y={124 - h} width="8" height={h} rx="1.5" fill="currentColor" fillOpacity={i === 3 ? 0.65 : 0.28} />
              );
            })}
          </>
        )}
        {layout === 1 && (
          <>
            <rect x="11" y="10" width="82" height="126" rx="3" fill="none" stroke="currentColor" strokeOpacity=".3" />
            <rect x="30" y="34" width="44" height="5" rx="2.5" fill={INK} fillOpacity=".45" />
            {[48, 55, 62].map((y, i) => bar(y, w(i), 52 - w(i) / 2))}
            <circle cx="52" cy="104" r="12" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".5" />
          </>
        )}
        {layout === 2 && (
          <>
            <rect x="14" y="38" width="76" height="9" rx="2" fill="currentColor" fillOpacity=".25" />
            {Array.from({ length: 8 }, (_, r) => (
              <g key={r}>
                {bar(53 + r * 9, 20, 17)}
                {bar(53 + r * 9, 16 + ((s >>> r) % 3) * 4, 44)}
                {bar(53 + r * 9, 12, 76)}
              </g>
            ))}
          </>
        )}
        {layout === 3 && (
          <>
            {[40, 47, 54, 61, 68, 82, 89].map((y, i) => bar(y, w(i % 8) + 16, 14, i))}
            <path d="M16 118c5-9 9 4 13-3s5-7 8 0 6 2 10-3" fill="none" stroke={INK} strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </g>
      <path d="M84 3v10a6 6 0 0 0 6 6h10" fill="#f3f5f2" stroke="#000" strokeOpacity=".08" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Progress                                  */
/* -------------------------------------------------------------------------- */

const STEPS = ["Choose", "Your details", "Admin review", "Email access"] as const;

function Progress({ current, className }: { current: number; className?: string }) {
  return (
    <div className={className}>
      <p className="sr-only">
        Step {current + 1} of {STEPS.length}: {STEPS[current]}
      </p>
      <ol aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {STEPS.map((label, index) => (
          <li key={label}>
            <span
              className={cn(
                "block h-[3px] rounded-full transition-colors duration-300",
                index <= current ? "bg-evergreen-700" : "bg-black/[0.08]"
              )}
            />
            <span
              className={cn(
                "mt-2 block truncate text-[11.5px] transition-colors duration-300",
                index === current
                  ? "font-semibold text-evergreen-950"
                  : index < current
                    ? "text-evergreen-950/70"
                    : "text-ink-muted/70"
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Controls                                  */
/* -------------------------------------------------------------------------- */

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-200",
        still,
        focusRing,
        checked ? "bg-evergreen-700" : "bg-black/[0.12]"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform duration-200 motion-reduce:transition-none",
          checked && "translate-x-[18px]"
        )}
      />
    </button>
  );
}

type CardState = "off" | "on" | "included";

function SelectMark({ state, className }: { state: CardState; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-[22px] shrink-0 place-items-center rounded-full transition-colors duration-150",
        state === "off" && "border-[1.5px] border-black/20 bg-white/90 text-transparent",
        state === "on" && "bg-evergreen-700 text-white",
        state === "included" && "bg-evergreen-700/45 text-white",
        className
      )}
    >
      <CheckIcon className="size-3" />
    </span>
  );
}

function DocumentCard({
  option,
  state,
  onToggle,
}: {
  option: PublicDocumentOption;
  state: CardState;
  onToggle: () => void;
}) {
  const active = state !== "off";
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={state === "included"}
      onClick={onToggle}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-[12px] p-2 text-left transition-colors duration-150 hover:bg-black/[0.025] disabled:cursor-default disabled:hover:bg-transparent sm:block sm:p-0 sm:hover:bg-transparent",
        still,
        focusRing
      )}
    >
      {/* preview */}
      <span
        className={cn(
          "relative grid size-14 shrink-0 place-items-center rounded-[10px] transition-[background-color,box-shadow] duration-150 sm:aspect-[5/6] sm:size-auto sm:w-full sm:rounded-[14px]",
          active
            ? "bg-[#edf3ec] shadow-[inset_0_0_0_2px] shadow-evergreen-700"
            : "bg-[#f2f4f1] group-hover:bg-[#eceeea]"
        )}
      >
        <DocThumb id={option.id} className="w-8 text-evergreen-700 sm:w-[54%]" />
        <SelectMark state={state} className="absolute right-2.5 top-2.5 hidden sm:grid" />
      </span>

      {/* caption */}
      <span className="block min-w-0 flex-1 sm:mt-2.5 sm:px-0.5">
        <span className="line-clamp-1 text-[14px] font-medium leading-snug text-evergreen-950 sm:line-clamp-2 sm:text-[13.5px]">
          {option.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-muted">
          <LockIcon className="size-3 shrink-0" />
          <span className="truncate">{state === "included" ? `Included with all ${option.category}` : option.category}</span>
        </span>
      </span>

      <SelectMark state={state} className="sm:hidden" />
      <span className="sr-only">
        {state === "included" ? "Included in the whole type request." : active ? "Selected." : "Not selected."}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type Tab = DocumentCategory | "all";

export function RequestAccessForm({
  options,
  notice,
}: {
  options: PublicDocumentOption[];
  notice?: React.ReactNode;
}) {
  /**
   * Two independent choices, so the logic stays predictable:
   * - wholeTypes: "send me everything of this type" (switch)
   * - selected:   individual files
   * A file inside a whole type is covered by it, so it is not stored twice.
   * The categories sent to the server are derived from both.
   */
  const [wholeTypes, setWholeTypes] = useState<DocumentCategory[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [contactReady, setContactReady] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{ types: DocumentCategory[]; fileIds: string[] }>({
    types: [],
    fileIds: [],
  });
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);

  const isWide = useMediaQuery("(min-width: 640px)", true);
  const pageSize = isWide ? PAGE_DESKTOP : PAGE_MOBILE;

  const counts = useMemo(() => {
    const map = Object.fromEntries(DOCUMENT_CATEGORIES.map(c => [c, 0])) as Record<DocumentCategory, number>;
    for (const option of options) map[option.category] += 1;
    return map;
  }, [options]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter(
      option =>
        (tab === "all" || option.category === tab) &&
        (!needle || option.title.toLowerCase().includes(needle))
    );
  }, [options, tab, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const selectedOptions = options.filter(option => selected.includes(option.id));
  const categories = DOCUMENT_CATEGORIES.filter(
    c => wholeTypes.includes(c) || selectedOptions.some(o => o.category === c)
  );
  const itemCount = wholeTypes.length + selectedOptions.length;
  const step = contactReady ? 2 : itemCount > 0 ? 1 : 0;
  const activeType = tab === "all" ? null : tab;

  useEffect(() => setPage(0), [tab, query, pageSize]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (fieldErrors.details) setShowDetails(true);
  }, [fieldErrors.details]);

  /* ------------------------------ success view ----------------------------- */

  if (done) {
    const requested = options.filter(o => summary.fileIds.includes(o.id));
    const lines = [...summary.types.map(t => `All ${t}`), ...requested.map(o => o.title)];
    return (
      <div role="status" className="mx-auto w-full max-w-xl py-4 sm:py-8">
        <Progress current={2} />
        <div className="pt-14 text-center sm:pt-20">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-evergreen-700 text-white">
            <CheckIcon className="size-6" />
          </span>
          <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.025em] text-evergreen-950">Request sent</h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-muted">{REQUEST_RECEIVED_MESSAGE}</p>

          {lines.length > 0 && (
            <ul className="mx-auto mt-8 max-w-sm divide-y divide-black/[0.06] rounded-[14px] bg-[#f7f8f6] text-left">
              {lines.slice(0, 4).map(line => (
                <li key={line} className="flex items-center gap-2.5 px-4 py-3 text-[14px] text-evergreen-950">
                  <LockIcon className="size-3.5 shrink-0 text-ink-muted" />
                  <span className="truncate">{line}</span>
                </li>
              ))}
              {lines.length > 4 && (
                <li className="px-4 py-3 text-[13px] text-ink-muted">and {lines.length - 4} more</li>
              )}
            </ul>
          )}

          <Link
            href="/"
            className={cn(
              "mt-9 inline-flex h-11 items-center justify-center rounded-full px-6 text-[15px] font-medium text-evergreen-700 transition-colors hover:bg-[#edf3ec]",
              still,
              focusRing
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------- handlers ------------------------------- */

  const toggleFile = (option: PublicDocumentOption) =>
    setSelected(current =>
      current.includes(option.id) ? current.filter(id => id !== option.id) : [...current, option.id]
    );

  const toggleType = (type: DocumentCategory) => {
    const on = !wholeTypes.includes(type);
    setWholeTypes(current => (on ? [...current, type] : current.filter(t => t !== type)));
    // The whole type covers its files, so single picks inside it are folded in.
    if (on) setSelected(current => current.filter(id => options.find(o => o.id === id)?.category !== type));
  };

  const clearAll = () => {
    setWholeTypes([]);
    setSelected([]);
  };

  function onFormChange(event: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const ready = String(form.get("name") ?? "").trim().length > 0 && EMAIL_RE.test(String(form.get("email") ?? "").trim());
    if (ready !== contactReady) setContactReady(ready);

    // Clear a field's error as soon as the person edits it.
    const field = (event.target as HTMLInputElement).name;
    if (field && fieldErrors[field]) {
      setFieldErrors(({ [field]: _removed, ...rest }) => rest);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");

    // Check the two required fields here first; no round trip for an empty name.
    const local: Record<string, string> = {};
    if (!text("name").trim()) local.name = "Enter your name.";
    const email = text("email").trim();
    if (!email) local.email = "Enter your email.";
    else if (!EMAIL_RE.test(email)) local.email = "Enter a valid email address.";
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      document.getElementById(local.name ? "request-name" : "request-email")?.focus();
      return;
    }

    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitDocumentRequest({
        name: text("name"),
        email: text("email"),
        company: "",
        purpose: "",
        details: text("details"),
        categories,
        documentIds: selected,
        website: text("website"),
      });
      if (result.ok) {
        setSummary({ types: wholeTypes, fileIds: selected });
        return setDone(true);
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  /* ---------------------------------- view --------------------------------- */

  const tabs: Tab[] = ["all", ...DOCUMENT_CATEGORIES];
  const pickedIn = (t: Tab) =>
    t !== "all" && (wholeTypes.includes(t) || selectedOptions.some(o => o.category === t));

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} noValidate className="w-full">
      {/* ------------------------------- Header ------------------------------- */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="max-w-lg">
          <p className="text-[13px] font-medium text-evergreen-700">Evergreen documents</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-evergreen-950 sm:text-[32px]">
            Request documents
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            Previews stay blurred until access is approved. Choose what you need, and we’ll email you once an admin
            has reviewed your request.
          </p>
        </div>
        <Progress current={step} className="w-full lg:max-w-[400px]" />
      </header>

      {notice && <div className="mt-6">{notice}</div>}
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-700/25"
        >
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-8 border-t border-black/[0.06] pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        {/* ------------------------------ Library ------------------------------ */}
        <section aria-label="Document library" className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Filter by type"
              className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto rounded-[10px] bg-black/[0.045] p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-none"
            >
              {tabs.map(t => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTab(t)}
                    className={cn(
                      "relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                      still,
                      focusRing,
                      active
                        ? "bg-white text-evergreen-950 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                        : "text-ink-muted hover:text-evergreen-950"
                    )}
                  >
                    {t === "all" ? "All" : t}
                    {pickedIn(t) && <span aria-label="has selections" className="size-1.5 rounded-full bg-evergreen-700" />}
                  </button>
                );
              })}
            </div>

            {options.length > PAGE_DESKTOP && (
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search documents"
                className={cn(inputClass, "h-[38px] bg-black/[0.045] border-transparent sm:ml-auto sm:w-48 focus-visible:bg-white")}
              />
            )}
          </div>

          {activeType && (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] bg-[#f7f8f6] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-evergreen-950">All {activeType} documents</p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">{DOCUMENT_CATEGORY_HINTS[activeType]}</p>
              </div>
              <Switch
                checked={wholeTypes.includes(activeType)}
                onChange={() => toggleType(activeType)}
                label={`Request all ${activeType} documents`}
              />
            </div>
          )}

          {visible.length > 0 ? (
            <div className="mt-4 grid gap-1 sm:mt-5 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-5">
              {visible.map(option => (
                <DocumentCard
                  key={option.id}
                  option={option}
                  state={
                    wholeTypes.includes(option.category) ? "included" : selected.includes(option.id) ? "on" : "off"
                  }
                  onToggle={() => toggleFile(option)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 grid place-items-center rounded-[14px] bg-[#f7f8f6] px-6 py-14 text-center">
              <p className="text-[15px] font-medium text-evergreen-950">
                {query ? "No results" : "Nothing listed here yet"}
              </p>
              <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink-muted">
                {query
                  ? "Try a different word, or name the document in your request."
                  : activeType
                    ? "Turn on the switch above and we’ll share what’s available."
                    : "Name the document you need in your request."}
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="mt-5 flex items-center justify-between text-[13px] text-ink-muted">
              <span className="tabular-nums">
                {filtered.length} {filtered.length === 1 ? "document" : "documents"}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    className={cn(
                      "grid size-8 cursor-pointer place-items-center rounded-full text-evergreen-950 transition-colors hover:bg-black/[0.05] disabled:cursor-default disabled:text-black/20 disabled:hover:bg-transparent",
                      still,
                      focusRing
                    )}
                  >
                    <Chevron dir="left" className="size-4" />
                  </button>
                  <span className="min-w-12 text-center tabular-nums" aria-live="polite">
                    {safePage + 1} / {pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
                    disabled={safePage >= pages - 1}
                    aria-label="Next page"
                    className={cn(
                      "grid size-8 cursor-pointer place-items-center rounded-full text-evergreen-950 transition-colors hover:bg-black/[0.05] disabled:cursor-default disabled:text-black/20 disabled:hover:bg-transparent",
                      still,
                      focusRing
                    )}
                  >
                    <Chevron dir="right" className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ---------------------------- Request panel --------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[18px] bg-[#f7f8f6] p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-evergreen-950">Your request</h2>
              {itemCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className={cn("cursor-pointer rounded text-[13px] text-evergreen-700 hover:text-evergreen-950", still, focusRing)}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {/* selection list */}
            <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
              {itemCount > 0 ? (
                <ul data-lenis-prevent className="max-h-[172px] divide-y divide-black/[0.06] overflow-y-auto">
                  {wholeTypes.map(type => (
                    <li key={type} className="flex items-center gap-3 py-2.5 pl-3.5 pr-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-evergreen-950">All {type}</span>
                        <span className="block text-[12px] text-ink-muted">
                          {counts[type] > 0 ? `${counts[type]} ${counts[type] === 1 ? "file" : "files"}` : "Whatever is available"}
                        </span>
                      </span>
                      <RemoveButton label={`all ${type} documents`} onClick={() => toggleType(type)} />
                    </li>
                  ))}
                  {selectedOptions.map(option => (
                    <li key={option.id} className="flex items-center gap-3 py-2.5 pl-3.5 pr-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-evergreen-950">{option.title}</span>
                        <span className="block text-[12px] text-ink-muted">{option.category}</span>
                      </span>
                      <RemoveButton label={option.title} onClick={() => toggleFile(option)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3.5 py-3">
                  <p className="text-[14px] text-evergreen-950">General access</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">
                    Nothing selected. Pick files, or send as is.
                  </p>
                </div>
              )}
            </div>

            {/* not listed — progressive disclosure */}
            {showDetails ? (
              <div className="mt-3">
                <label htmlFor="request-details" className="sr-only">
                  Document not listed
                </label>
                <input
                  id="request-details"
                  name="details"
                  maxLength={500}
                  autoFocus={!fieldErrors.details}
                  placeholder="Name a document that isn’t listed"
                  aria-invalid={Boolean(fieldErrors.details)}
                  aria-describedby={fieldErrors.details ? "request-details-error" : undefined}
                  className={inputClass}
                />
                {fieldErrors.details && (
                  <p id="request-details-error" className="mt-1.5 text-[12.5px] text-red-700">
                    {fieldErrors.details}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className={cn("mt-3 cursor-pointer rounded text-[13px] text-evergreen-700 hover:text-evergreen-950", still, focusRing)}
              >
                + Can’t find a document?
              </button>
            )}

            {/* contact */}
            <div className="mt-5 space-y-3 border-t border-black/[0.06] pt-5">
              <InputField id="request-name" name="name" label="Name" autoComplete="name" placeholder="Full name" error={fieldErrors.name} />
              <InputField
                id="request-email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                placeholder="you@company.com"
                error={fieldErrors.email}
              />
            </div>

            {/* honeypot */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className={cn(
                "mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-evergreen-950 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-evergreen-800 disabled:cursor-wait disabled:opacity-60",
                still,
                focusRing
              )}
            >
              {pending && (
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
              )}
              {pending ? "Sending…" : "Send request"}
            </button>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-muted">
              Every request is reviewed before access is granted.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Small pieces                                */
/* -------------------------------------------------------------------------- */

function InputField({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & React.ComponentPropsWithoutRef<"input">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-evergreen-950">
        {label}
        <span aria-hidden="true" className="text-ink-muted"> *</span>
        <span className="sr-only"> (required)</span>
      </label>
      <input
        id={id}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remove ${label}`}
      className={cn(
        "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-black/35 transition-colors hover:bg-black/[0.05] hover:text-evergreen-950",
        still,
        focusRing
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3.5">
        <path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}