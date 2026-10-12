"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, Info, XCircle } from "lucide-react";
import type { Check, ChecklistItem, FixTarget, ScoreGroup, ScoreReport, Status } from "@/lib/seo-score";

const TONE = (score: number) => (score >= 80 ? "#4E6B12" : score >= 60 ? "#b45309" : "#c43a4a");

function ScoreRing({ score, label, size = 64 }: { score: number; label: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} score ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16, 54, 38,0.1)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE(score)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease-out" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 3.6} fontWeight={600} fill="#1A6B37">
          {score}
        </text>
      </svg>
      <span className="text-xs font-medium text-evergreen-700">{label}</span>
    </div>
  );
}

export function StatusIcon({ status }: { status: Status }) {
  if (status === "pass") return <CheckCircle2 className="size-4 shrink-0 text-moss-ink" aria-label="Pass" />;
  if (status === "warn") return <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-label="Needs work" />;
  return <XCircle className="size-4 shrink-0 text-destructive" aria-label="Fail" />;
}

function Row({ item, onFix }: { item: Check | ChecklistItem; onFix: (t: FixTarget) => void }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-evergreen-700">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.message}</p>
      </div>
      {item.status !== "pass" && item.fix && (
        <button type="button" onClick={() => onFix(item.fix!)} className="inline-flex shrink-0 items-center text-xs font-medium text-moss-ink hover:underline">
          Fix <ChevronRight className="size-3" />
        </button>
      )}
    </li>
  );
}

function Group({ title, group, onFix, open }: { title: string; group: ScoreGroup; onFix: (t: FixTarget) => void; open?: boolean }) {
  const failing = group.checks.filter((c) => c.status !== "pass").length;
  return (
    <details open={open} className="group rounded-lg border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-evergreen-700">{title}</span>
        <span className="flex items-center gap-2 text-xs">
          {failing > 0 && <span className="text-muted-foreground">{failing} to improve</span>}
          <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: TONE(group.score) }}>
            {group.score}
          </span>
        </span>
      </summary>
      <ul className="divide-y divide-line border-t border-line px-3">
        {[...group.checks]
          .sort((a, b) => (a.status === b.status ? 0 : a.status === "fail" ? -1 : b.status === "fail" ? 1 : a.status === "warn" ? -1 : 1))
          .map((c) => (
            <Row key={c.id} item={c} onFix={onFix} />
          ))}
      </ul>
    </details>
  );
}

export function ScorePanel({ report, onFix }: { report: ScoreReport | null; onFix: (t: FixTarget) => void }) {
  if (!report) return <p className="text-sm text-muted-foreground">Calculating…</p>;
  const w = report.wordCount;
  const pct = Math.min(100, (w.count / (w.max * 1.5)) * 100);
  const passed = report.checklist.filter((c) => c.status === "pass").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1">
        <ScoreRing score={report.seo.score} label="SEO" />
        <ScoreRing score={report.aeo.score} label="AEO" />
        <ScoreRing score={report.geo.score} label="GEO" />
        <ScoreRing score={report.readability.score} label="Readability" />
      </div>

      <section className="rounded-lg border border-line p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-evergreen-700">Word count</span>
          <span className="flex items-center gap-1.5">
            <StatusIcon status={w.status} />
            {w.count.toLocaleString("en-IN")} · {w.readingTime} min read
          </span>
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-paper-2" aria-hidden>
          <div className="absolute inset-y-0 rounded-full bg-evergreen-700/25" style={{ left: `${(w.min / (w.max * 1.5)) * 100}%`, width: `${((w.max - w.min) / (w.max * 1.5)) * 100}%` }} />
          <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-evergreen-700 shadow" style={{ left: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Recommended for this content type: {w.min.toLocaleString("en-IN")}–{w.max.toLocaleString("en-IN")} words.
        </p>
      </section>

      <section>
        <h3 className="mb-1 flex items-center justify-between text-sm font-semibold text-evergreen-700">
          Publish checklist <span className="text-xs font-normal text-muted-foreground">{passed}/{report.checklist.length} done</span>
        </h3>
        <ul className="divide-y divide-line rounded-lg border border-line px-3">
          {report.checklist.map((c) => (
            <Row key={c.id} item={c} onFix={onFix} />
          ))}
        </ul>
      </section>

      <div className="space-y-2">
        <Group title="SEO" group={report.seo} onFix={onFix} />
        <Group title="AEO (answer engines)" group={report.aeo} onFix={onFix} />
        <Group title="GEO (generative engines)" group={report.geo} onFix={onFix} />
        <Group title="Readability" group={report.readability} onFix={onFix} />
        <Group title="Schema" group={report.schema} onFix={onFix} />
        <Group title="Links" group={report.links} onFix={onFix} />
        <Group title="Images" group={report.images} onFix={onFix} />
        <Group title="Headings" group={report.headings} onFix={onFix} />
      </div>

      <p className="flex gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> Flesch {report.stats.flesch} · {report.stats.avgSentence} words/sentence · keyword density {report.stats.density}%. Scores are guidance:
        write for readers first.
      </p>
    </div>
  );
}
