/** Indian financial years (April–March), written "2025-26" and handled as their start year. */

const FY_RE = /^(\d{4})-(\d{2})$/;

export function parseFy(fy: string): number | null {
  const m = FY_RE.exec(fy);
  if (!m) return null;
  const start = Number(m[1]);
  return (start + 1) % 100 === Number(m[2]) ? start : null;
}

export function formatFy(start: number): string {
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** The financial year containing `date` (April starts a new year). */
export function fyOf(date: Date): string {
  const y = date.getFullYear();
  return formatFy(date.getMonth() >= 3 ? y : y - 1);
}

/** Inclusive list of financial years, newest first. */
export function fyRange(from: number, to: number): string[] {
  const out: string[] = [];
  for (let y = to; y >= from; y--) out.push(formatFy(y));
  return out;
}
