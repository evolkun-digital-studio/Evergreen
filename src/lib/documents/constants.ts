// Client-safe constants for the private Documents library.

export const DOCUMENT_CATEGORIES = [
  "Certificates & Licences",
  "Registrations",
  "Company Profile",
  "Compliance Reports",
  "Other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

/** One line per category, shown on the public request form so visitors can tell the types apart. */
export const DOCUMENT_CATEGORY_HINTS: Record<DocumentCategory, string> = {
  "Certificates & Licences": "Authorisations and licences issued to the company",
  Registrations: "Company and government registrations",
  "Company Profile": "Who we are and what we do",
  "Compliance Reports": "Audit and compliance reports",
  Other: "Anything that does not fit the types above",
};

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

/** Accepted uploads, by MIME type, with the extension stored on the private key. */
export const DOCUMENT_TYPES: Record<string, { ext: string; label: string }> = {
  "application/pdf": { ext: "pdf", label: "PDF" },
  "image/jpeg": { ext: "jpg", label: "JPG" },
  "image/png": { ext: "png", label: "PNG" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", label: "DOCX" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", label: "XLSX" },
};

export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
