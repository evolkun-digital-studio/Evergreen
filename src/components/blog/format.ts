const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** Public article dates, e.g. "6 October 2026" (IST). */
export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
