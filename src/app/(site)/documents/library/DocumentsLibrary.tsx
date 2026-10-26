"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileImage, FileSpreadsheet, FileText, LogOut, Search } from "lucide-react";
import { DOCUMENT_CATEGORIES, formatBytes } from "@/lib/documents/constants";
import type { DocumentItem } from "@/lib/data/documents";
import { cn } from "@/lib/utils";

const fileUrl = (id: string, download = false) => `/api/documents/${id}/file${download ? "?download=1" : ""}`;

function FileIcon({ mime }: { mime: string }) {
  const Icon = mime.startsWith("image/") ? FileImage : mime.includes("spreadsheet") ? FileSpreadsheet : FileText;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-paper-2 text-evergreen-700">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function DocumentsLibrary({
  documents,
  user,
  signOutAction,
}: {
  documents: DocumentItem[];
  user: { name: string; email: string };
  /** Omitted for emailed-link visitors, who have no session to end. */
  signOutAction?: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = documents.filter(
      (d) => (!category || d.category === category) && (!q || `${d.title} ${d.description} ${d.fileName}`.toLowerCase().includes(q)),
    );
    return DOCUMENT_CATEGORIES.map((c) => ({ category: c, items: matches.filter((d) => d.category === c) })).filter((g) => g.items.length);
  }, [documents, query, category]);

  const usedCategories = DOCUMENT_CATEGORIES.filter((c) => documents.some((d) => d.category === c));

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-evergreen-950 sm:text-4xl">Documents</h1>
          <p className="mt-2 text-[15px] text-ink-muted">Company certificates, registrations and reports for authorised users.</p>
        </div>
        {signOutAction ? (
          <form action={signOutAction} className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] text-ink-muted sm:justify-end sm:pt-2">
            <span className="min-w-0 [overflow-wrap:anywhere]">
              Signed in as <strong className="font-semibold text-evergreen-950">{user.email}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <button type="submit" className="inline-flex items-center gap-1 font-semibold text-evergreen-700 hover:underline">
              <LogOut className="size-3.5" aria-hidden="true" /> Sign out
            </button>
          </form>
        ) : (
          <p className="min-w-0 text-[13px] text-ink-muted [overflow-wrap:anywhere] sm:pt-2">
            Shared with <strong className="font-semibold text-evergreen-950">{user.email}</strong>
          </p>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-paper-2 px-6 py-14 text-center text-ink-muted">No documents available yet.</div>
      ) : (
        <>
          <div className="mt-8 rounded-[16px] bg-paper-2 p-4 sm:p-5">
            <label className="relative block">
              <span className="sr-only">Search documents</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents"
                className="h-11 w-full rounded-[8px] border border-line bg-white pl-9 pr-3 text-[15px] outline-none focus-visible:border-evergreen-700 focus-visible:ring-2 focus-visible:ring-evergreen-700/20"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {[null, ...usedCategories].map((c) => (
                <button
                  key={c ?? "all"}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                    category === c ? "border-evergreen-700 bg-evergreen-700 text-white" : "border-line bg-white text-evergreen-950 hover:border-evergreen-700",
                  )}
                >
                  {c ?? "All"}
                </button>
              ))}
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="mt-10 text-center text-ink-muted">No documents match your search.</p>
          ) : (
            groups.map((g, gi) => (
              <section key={g.category} className="mt-10" aria-labelledby={`doc-cat-${gi}`}>
                <h2 id={`doc-cat-${gi}`} className="font-display text-lg font-semibold text-evergreen-950">
                  {g.category}
                </h2>
                <ul className="mt-3 divide-y divide-line rounded-[16px] border border-line bg-white">
                  {g.items.map((d) => (
                    <li key={d.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <FileIcon mime={d.mimeType} />
                        <div className="min-w-0">
                          <p className="font-display text-[15px] font-semibold text-evergreen-950 [overflow-wrap:anywhere]">{d.title}</p>
                          {d.description && <p className="mt-0.5 line-clamp-2 text-[14px] text-ink-muted">{d.description}</p>}
                          <p className="mt-1 text-[12px] text-ink-muted">
                            {formatBytes(d.size)} · Updated {dateFmt.format(new Date(d.updatedAt))}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <a
                          href={fileUrl(d.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-line px-4 text-[13px] font-semibold text-evergreen-950 hover:border-evergreen-700 sm:flex-none"
                        >
                          <Eye className="size-4" aria-hidden="true" /> View
                        </a>
                        <a
                          href={fileUrl(d.id, true)}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-evergreen-700 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-800 sm:flex-none"
                        >
                          <Download className="size-4" aria-hidden="true" /> Download
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </>
  );
}
