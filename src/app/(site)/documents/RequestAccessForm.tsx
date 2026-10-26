"use client";

import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, Building2, Check, CheckCircle2, ClipboardList, FileBarChart, Files, type LucideIcon } from "lucide-react";
import type { PublicDocumentOption } from "@/lib/data/document-requests";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_HINTS, type DocumentCategory } from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import { submitDocumentRequest } from "./actions";

export const REQUEST_RECEIVED_MESSAGE = "Thanks. Admin will respond to you very soon by email.";

const CATEGORY_ICONS: Record<DocumentCategory, LucideIcon> = {
  "Certificates & Licences": BadgeCheck,
  Registrations: ClipboardList,
  "Company Profile": Building2,
  "Compliance Reports": FileBarChart,
  Other: Files,
};

const inputClass =
  "w-full rounded-[10px] border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus-visible:border-evergreen-700 focus-visible:ring-2 focus-visible:ring-evergreen-700/20";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14px] font-semibold text-evergreen-950">{label}</span>
        {hint && <span className="text-[13px] text-ink-muted">{hint}</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-[13px] text-red-700">{error}</span>}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-display text-lg font-semibold text-evergreen-950">{title}</h2>
        {description && <p className="mt-0.5 text-[14px] text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function RequestAccessForm({ options }: { options: PublicDocumentOption[] }) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const byCategory = useMemo(
    () => Object.fromEntries(DOCUMENT_CATEGORIES.map((c) => [c, options.filter((o) => o.category === c)])) as Record<DocumentCategory, PublicDocumentOption[]>,
    [options],
  );

  if (done) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-[16px] bg-paper-2 p-6 text-evergreen-950">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-evergreen-700" aria-hidden="true" />
        <div>
          <p className="font-display text-lg font-semibold">{REQUEST_RECEIVED_MESSAGE}</p>
          <p className="mt-1 text-[14px] text-ink-muted">We have sent a receipt to your inbox. The link arrives in a second email once your request is approved.</p>
        </div>
      </div>
    );
  }

  const toggleCategory = (c: DocumentCategory) => {
    const on = categories.includes(c);
    setCategories(on ? categories.filter((x) => x !== c) : [...categories, c]);
    // Unticking a type also drops the files picked under it.
    if (on) setSelected(selected.filter((id) => !byCategory[c].some((o) => o.id === id)));
  };
  const toggleFile = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const setAll = (c: DocumentCategory, on: boolean) => {
    const ids = byCategory[c].map((o) => o.id);
    setSelected((prev) => (on ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))));
  };

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitDocumentRequest({
        name: text("name"),
        email: text("email"),
        company: text("company"),
        purpose: text("purpose"),
        details: text("details"),
        categories,
        documentIds: selected,
        website: text("website"),
      });
      if (result.ok) return setDone(true);
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <Section title="Your details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" error={fieldErrors.name}>
            <input name="name" autoComplete="name" required className={cn(inputClass, "h-11")} />
          </Field>
          <Field label="Email" error={fieldErrors.email}>
            <input name="email" type="email" autoComplete="email" required className={cn(inputClass, "h-11")} />
          </Field>
        </div>
        <Field label="Company" hint="Optional" error={fieldErrors.company}>
          <input name="company" autoComplete="organization" className={cn(inputClass, "h-11")} />
        </Field>
      </Section>

      <Section title="What kind of document do you need?" description="Pick one or more types. You can also choose exact files, or skip this and describe what you need.">
        <div role="group" aria-label="Document types" className="grid gap-3 sm:grid-cols-2">
          {DOCUMENT_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const on = categories.includes(c);
            const count = byCategory[c].length;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(c)}
                className={cn(
                  "relative flex items-start gap-3 rounded-[14px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-700/30",
                  on ? "border-evergreen-700 bg-paper-2" : "border-line bg-white hover:border-evergreen-700/60",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", on ? "bg-evergreen-700 text-white" : "bg-paper-2 text-evergreen-700")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 pr-6">
                  <span className="block font-display text-[15px] font-semibold text-evergreen-950">{c}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{DOCUMENT_CATEGORY_HINTS[c]}</span>
                  <span className="mt-1.5 block text-[12px] text-ink-muted">{count ? `${count} ${count === 1 ? "file" : "files"} available` : "Tell us what you need below"}</span>
                </span>
                {on && <Check className="absolute right-3.5 top-3.5 size-4 text-evergreen-700" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {categories.some((c) => byCategory[c].length > 0) && (
          <div className="space-y-4 rounded-[14px] bg-paper-2 p-4 sm:p-5">
            <p className="text-[14px] font-semibold text-evergreen-950">Choose exact files (optional)</p>
            {categories
              .filter((c) => byCategory[c].length > 0)
              .map((c) => {
                const allOn = byCategory[c].every((o) => selected.includes(o.id));
                return (
                  <fieldset key={c}>
                    <legend className="flex w-full items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-evergreen-950">{c}</span>
                      <button type="button" onClick={() => setAll(c, !allOn)} className="text-[13px] font-semibold text-evergreen-700 hover:underline">
                        {allOn ? "Clear" : "Select all"}
                      </button>
                    </legend>
                    <ul className="mt-2 space-y-2">
                      {byCategory[c].map((o) => (
                        <li key={o.id}>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] bg-white px-3 py-2.5 text-[15px] text-ink">
                            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleFile(o.id)} className="mt-1 size-4 accent-evergreen-700" />
                            <span>{o.title}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                );
              })}
          </div>
        )}

        <Field label="Name the document you are looking for" hint="Optional" error={fieldErrors.details}>
          <input name="details" maxLength={500} placeholder="For example: pollution board authorisation, latest audit report" className={cn(inputClass, "h-11")} />
        </Field>
      </Section>

      <Section title="Why do you need access?">
        <Field label="Reason" hint="Optional. It helps us reply faster." error={fieldErrors.purpose}>
          <textarea name="purpose" rows={3} maxLength={1000} className={cn(inputClass, "py-2.5")} />
        </Field>
      </Section>

      {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-[10px] bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center rounded-[10px] bg-evergreen-700 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-evergreen-800 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send request"}
        </button>
        <p className="text-[13px] text-ink-muted">Our admin team reviews every request and replies by email.</p>
      </div>
    </form>
  );
}
