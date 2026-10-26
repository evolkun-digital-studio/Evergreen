"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PublicDocumentOption } from "@/lib/data/document-requests";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_HINTS,
  type DocumentCategory,
} from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import { submitDocumentRequest } from "./actions";

export const REQUEST_RECEIVED_MESSAGE =
  "Thanks. Admin will respond to you very soon by email.";

const controlClass =
  "w-full rounded-[9px] border border-[#e1e6e0] bg-[#f7f8f6] px-3.5 text-[15px] text-ink outline-none transition-[border-color,background-color,box-shadow] placeholder:text-ink-muted/60 hover:border-evergreen-700/25 focus-visible:border-evergreen-700/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-evergreen-700/10";

const dropdownClass =
  "w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-[10px] border border-[#e1e6e0] bg-white p-1.5 text-ink shadow-[0_8px_24px_rgba(10,38,22,0.04)]";

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className="text-[14px] font-medium text-evergreen-950">
          {label}
        </span>
        {required && (
          <>
            <span aria-hidden="true" className="text-ink-muted">
              *
            </span>
            <span className="sr-only">Required</span>
          </>
        )}
        {hint && <span className="text-[12px] text-ink-muted">({hint})</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function FormSection({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("space-y-5", className)}
    >
      <div>
        <h2 id={id} className="text-[17px] font-semibold text-evergreen-950">
          {title}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

type DropdownTriggerProps = {
  label: string;
  ariaLabel: string;
} & Omit<React.ComponentPropsWithoutRef<"button">, "children">;

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ label, ariaLabel, className, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      type="button"
      aria-label={ariaLabel}
      className={cn(
        controlClass,
        "group flex min-h-11 cursor-pointer items-center justify-between gap-3 text-left",
        className
      )}
    >
      <span className="truncate">{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="size-4 shrink-0 text-ink-muted transition-transform group-data-[state=open]:rotate-180"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
);

DropdownTrigger.displayName = "DropdownTrigger";

export function RequestAccessForm({
  options,
  notice,
}: {
  options: PublicDocumentOption[];
  notice?: React.ReactNode;
}) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{
    categories: DocumentCategory[];
    files: number;
  }>({ categories: [], files: 0 });
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement>(null);

  const byCategory = useMemo(
    () =>
      Object.fromEntries(
        DOCUMENT_CATEGORIES.map(category => [
          category,
          options.filter(option => option.category === category),
        ])
      ) as Record<DocumentCategory, PublicDocumentOption[]>,
    [options]
  );

  const pickable = categories.filter(
    category => byCategory[category].length > 0
  );
  const selectedOptions = options.filter(option =>
    selected.includes(option.id)
  );
  const categorySummary =
    categories.length === 0
      ? "Select document types"
      : categories.length === 1
        ? categories[0]
        : `${categories.length} document types selected`;
  const fileSummary =
    selectedOptions.length === 0
      ? "Select exact documents"
      : `${selectedOptions.length} ${selectedOptions.length === 1 ? "document" : "documents"} selected`;

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (done) {
    return (
      <div
        role="status"
        className="px-2 py-12 text-center sm:px-8 sm:py-16"
      >
        <span className="mx-auto grid size-11 place-items-center rounded-[10px] bg-[#edf3ec] text-evergreen-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-5"
          >
            <path
              d="m5 12.5 4.2 4.2L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="mx-auto mt-5 max-w-lg text-[22px] font-semibold leading-snug text-evergreen-950">
          Request received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink">
          {REQUEST_RECEIVED_MESSAGE}
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-muted">
          We’ll email you if access is approved.
          {(summary.categories.length > 0 || summary.files > 0) && (
            <>
              {" "}
              Your request included
              {summary.categories.length > 0
                ? ` ${summary.categories.length} document ${summary.categories.length === 1 ? "type" : "types"}`
                : ""}
              {summary.categories.length > 0 && summary.files > 0 ? " and" : ""}
              {summary.files > 0
                ? ` ${summary.files} specific ${summary.files === 1 ? "file" : "files"}`
                : ""}
              .
            </>
          )}
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[8px] bg-evergreen-950 px-5 text-[14px] font-medium text-white transition-[background-color,transform] hover:bg-evergreen-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-700/30 focus-visible:ring-offset-2"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const toggleCategory = (category: DocumentCategory) => {
    const isSelected = categories.includes(category);
    setCategories(current =>
      isSelected
        ? current.filter(item => item !== category)
        : [...current, category]
    );
    if (isSelected) {
      setSelected(current =>
        current.filter(
          id => !byCategory[category].some(option => option.id === id)
        )
      );
    }
  };

  const toggleFile = (id: string) => {
    setSelected(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
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
      if (result.ok) {
        setSummary({ categories, files: selected.length });
        return setDone(true);
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-[calc(100svh-8rem)] w-full flex-col bg-white"
    >
      <header className="border-b border-[#e8ebe7] pb-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-evergreen-700">
          Evergreen documents
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.025em] text-evergreen-950">
          Document request
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Choose what you need and leave your contact details. Fields marked *
          are required.
        </p>
      </header>

      {notice && <div className="pt-6">{notice}</div>}
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3.5 text-[14px] text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-700/25"
        >
          {error}
        </div>
      )}
      <section
        aria-label="Request information"
        className="grid flex-1 gap-x-10 gap-y-7 pt-7 lg:grid-cols-2 xl:gap-x-14"
      >

        <FormSection
          id="request-contact-heading"
          title="Contact details"
          description="Tell us who is requesting access and where to reply."
          className="lg:col-start-1 lg:row-start-1"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="request-name"
              label="Your name"
              required
              error={fieldErrors.name}
            >
              <input
                id="request-name"
                name="name"
                autoComplete="name"
                required
                placeholder="Full name"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name ? "request-name-error" : undefined
                }
                className={cn(controlClass, "h-11")}
              />
            </Field>
            <Field
              id="request-email"
              label="Email"
              required
              error={fieldErrors.email}
            >
              <input
                id="request-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? "request-email-error" : undefined
                }
                className={cn(controlClass, "h-11")}
              />
            </Field>
          </div>
          <Field
            id="request-company"
            label="Company"
            hint="Optional"
            error={fieldErrors.company}
          >
            <input
              id="request-company"
              name="company"
              autoComplete="organization"
              placeholder="Company or organisation"
              aria-invalid={Boolean(fieldErrors.company)}
              aria-describedby={
                fieldErrors.company ? "request-company-error" : undefined
              }
              className={cn(controlClass, "h-11")}
            />
          </Field>
        </FormSection>

        <FormSection
          id="request-documents-heading"
          title="Choose documents"
          description="Choose one or more document types, or leave this blank for general access."
          className="border-t border-[#e8ebe7] pt-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0"
        >
          <fieldset aria-describedby="document-types-help">
            <legend className="text-[14px] font-medium text-evergreen-950">
              Document type
            </legend>
            <p
              id="document-types-help"
              className="mt-1 text-[12px] text-ink-muted"
            >
              Optional
            </p>
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownTrigger
                    label={categorySummary}
                    ariaLabel="Choose document types"
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={6}
                  className={dropdownClass}
                >
                  <fieldset>
                    <legend className="sr-only">Document types</legend>
                    {DOCUMENT_CATEGORIES.map(category => (
                      <label
                        key={category}
                        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-paper-2"
                      >
                        <input
                          type="checkbox"
                          checked={categories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="mt-1 size-4 shrink-0 accent-evergreen-700"
                        />
                        <span>
                          <span className="block text-[14px] font-medium text-evergreen-950">
                            {category}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                            {DOCUMENT_CATEGORY_HINTS[category]}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </PopoverContent>
              </Popover>
            </div>
            {categories.length > 0 && (
              <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                Selected: {categories.join(", ")}
              </p>
            )}
          </fieldset>

          {pickable.length > 0 && (
            <fieldset aria-describedby="exact-documents-help">
              <legend className="text-[14px] font-medium text-evergreen-950">
                Exact documents
              </legend>
              <p
                id="exact-documents-help"
                className="mt-1 text-[12px] text-ink-muted"
              >
                Optional
              </p>
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownTrigger
                      label={fileSummary}
                      ariaLabel="Choose exact documents"
                    />
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={6}
                    className={cn(dropdownClass, "max-h-80 overflow-y-auto")}
                  >
                    <div className="space-y-1">
                      {pickable.map(category => (
                        <fieldset key={category}>
                          <legend className="px-3 pb-1 pt-2 text-[12px] font-semibold text-ink-muted">
                            {category}
                          </legend>
                          {byCategory[category].map(file => (
                            <label
                              key={file.id}
                              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-paper-2"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(file.id)}
                                onChange={() => toggleFile(file.id)}
                                className="mt-0.5 size-4 shrink-0 accent-evergreen-700"
                              />
                              <span className="text-[14px] leading-snug text-ink">
                                {file.title}
                              </span>
                            </label>
                          ))}
                        </fieldset>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {selectedOptions.length > 0 && (
                <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                  Selected:{" "}
                  {selectedOptions.map(option => option.title).join(", ")}
                </p>
              )}
            </fieldset>
          )}

          <Field
            id="request-details"
            label="Specific document"
            hint="Optional"
            error={fieldErrors.details}
          >
            <input
              id="request-details"
              name="details"
              maxLength={500}
              placeholder="Name a document you cannot find above"
              aria-invalid={Boolean(fieldErrors.details)}
              aria-describedby={
                fieldErrors.details ? "request-details-error" : undefined
              }
              className={cn(controlClass, "h-11")}
            />
          </Field>
        </FormSection>

        <FormSection
          id="request-context-heading"
          title="Reason for access"
          description="A short note helps our team review your request."
          className="border-t border-[#e8ebe7] pt-7 lg:col-start-1 lg:row-start-2"
        >
          <Field
            id="request-purpose"
            label="Reason"
            hint="Optional"
            error={fieldErrors.purpose}
          >
            <textarea
              id="request-purpose"
              name="purpose"
              rows={4}
              maxLength={1000}
              placeholder="For example: supplier onboarding or a compliance review"
              aria-invalid={Boolean(fieldErrors.purpose)}
              aria-describedby={
                fieldErrors.purpose ? "request-purpose-error" : undefined
              }
              className={cn(controlClass, "min-h-24 resize-y py-3")}
            />
          </Field>
        </FormSection>

        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </section>

      <footer className="mt-7 flex flex-col gap-4 border-t border-[#e8ebe7] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[12px] leading-relaxed text-ink-muted">
          Every request is reviewed before access is granted.
        </p>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-evergreen-950 px-6 text-[14px] font-medium text-white transition-[background-color,transform] hover:bg-evergreen-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-700/30 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65 sm:w-auto"
        >
          {pending && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
            />
          )}
          {pending ? "Sending…" : "Send request"}
        </button>
      </footer>
    </form>
  );
}
