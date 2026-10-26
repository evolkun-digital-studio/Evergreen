// Who is told about new document requests and website enquiries. Pure helpers, no database access.

/** Splits a pasted list of addresses (commas, semicolons, spaces or new lines) into unique lowercase emails. */
export function parseEmailList(value: string | undefined): string[] {
  const parts = (value ?? "").split(/[\s,;]+/).map((s) => s.trim().toLowerCase());
  return [...new Set(parts.filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)))];
}

/** The admin Settings list wins; ENQUIRY_EMAIL_TO is the fallback until someone sets it there. */
export function resolveNotificationRecipients(fromSettings: readonly string[], fromEnv: string | undefined): string[] {
  return fromSettings.length ? [...fromSettings] : parseEmailList(fromEnv);
}
