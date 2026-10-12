// Editors work in IST; everything is stored in UTC. India has no DST, so the offset is fixed.

const IST_OFFSET_MS = 330 * 60 * 1000;

/** "2026-10-06T14:30" typed in IST → ISO UTC string. */
export function istInputToIso(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST_OFFSET_MS;
  return new Date(utc).toISOString();
}

/** ISO UTC string → value for <input type="datetime-local"> in IST. */
export function isoToIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 16);
}

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function formatIst(iso: string | Date | null | undefined): string {
  return iso ? `${istFormatter.format(new Date(iso))} IST` : "";
}
