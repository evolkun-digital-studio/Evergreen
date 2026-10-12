// Client-safe description of the article document (Tiptap / ProseMirror JSON) shared by the
// editor, the server renderer, the TOC builder and the content scorers.

export type PMMark = { type: string; attrs?: Record<string, unknown> };
export type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
};
type PMDoc = PMNode & { type: "doc" };

export const EMPTY_DOC: PMDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const CALLOUT_VARIANTS = ["important", "warning", "tip", "note"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  important: "Important",
  warning: "Warning",
  tip: "Tip",
  note: "Note",
};

/** Languages offered in the code-block selector; all are pre-loaded by the Shiki highlighter. */
export const CODE_LANGUAGES = [
  { value: "plaintext", label: "Plain text" },
  { value: "bash", label: "Bash / Shell" },
  { value: "json", label: "JSON" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
] as const;
export const CODE_LANGUAGE_VALUES: string[] = CODE_LANGUAGES.map((l) => l.value);

/** Node names of the custom blocks (kept in one place so editor and renderer agree). */
export const NODES = {
  callout: "callout",
  expertQuote: "expertQuote",
  videoEmbed: "videoEmbed",
  keyTakeaways: "keyTakeawaysBlock",
  faq: "faqBlock",
  toc: "tocBlock",
} as const;

/** Extracts the 11-char YouTube id from any common YouTube URL form. */
export function youtubeId(url: string): string | null {
  const m = url
    .trim()
    .match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null;
}
