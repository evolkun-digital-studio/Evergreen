import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  return score >= 80 ? "good" : score >= 60 ? "ok" : "poor";
}

export function ScoreBadge({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  return (
    <span
      title={`${label} score: ${score}/100`}
      className={cn(
        "inline-flex min-w-9 justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        tone === "good" && "bg-emerald-100 text-emerald-800",
        tone === "ok" && "bg-amber-100 text-amber-800",
        tone === "poor" && "bg-red-100 text-red-800",
      )}
    >
      <span className="sr-only">{label} </span>
      {score}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        status === "PUBLISHED" && "bg-evergreen-700/15 text-moss-ink",
        status === "DRAFT" && "bg-paper-2 text-evergreen-700",
        status === "SCHEDULED" && "bg-sky-100 text-sky-800",
        status === "ARCHIVED" && "bg-zinc-100 text-zinc-700",
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
