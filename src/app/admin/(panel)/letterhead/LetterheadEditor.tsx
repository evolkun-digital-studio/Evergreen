"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FilePlus2, FileText, ImagePlus, Minus, Plus, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyBrand, LetterheadDraft, LetterheadRecord } from "@/lib/letterhead/types";
import { emptyLetterheadDraft } from "@/lib/letterhead/types";
import { paginateBodyHtml } from "@/lib/letterhead/pagination";
import { safeLetterBodyHtml } from "@/lib/letterhead/pagination";
import { duplicateLetterheadAction, deleteLetterheadAction, saveLetterheadAction } from "./actions";
import { LetterDocument } from "./LetterDocument";
import { downloadLetterheadPdf } from "./pdf";

type Props = { initialDocuments: LetterheadRecord[]; company: CompanyBrand };

function draftFromRecord(record: LetterheadRecord): LetterheadDraft {
  return { ...record };
}

function comparableDraft(draft: LetterheadDraft) {
  return JSON.stringify({ ...draft, signatureUrl: undefined, createdAt: undefined, updatedAt: undefined });
}

export function LetterheadEditor({ initialDocuments, company }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [draft, setDraft] = useState<LetterheadDraft>(() => emptyLetterheadDraft());
  const [lastSaved, setLastSaved] = useState(() => comparableDraft(emptyLetterheadDraft()));
  const [editorKey, setEditorKey] = useState(0);
  const [activePanel, setActivePanel] = useState<"editor" | "preview">("editor");
  const [zoom, setZoom] = useState(0.72);
  const [previewDraft, setPreviewDraft] = useState(draft);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");

  const isDirty = comparableDraft(draft) !== lastSaved;
  const bodyPages = useMemo(() => paginateBodyHtml(previewDraft.bodyHtml), [previewDraft.bodyHtml]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewDraft(draft), 180);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const update = <K extends keyof LetterheadDraft>(key: K, value: LetterheadDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateBody = useCallback((html: string) => setDraft((current) => ({ ...current, bodyHtml: html })), []);

  const openDocument = (record: LetterheadRecord) => {
    if (isDirty && !window.confirm("You have unsaved changes. Open another letter anyway?")) return;
    setDraft(draftFromRecord(record));
    setLastSaved(comparableDraft(record));
    setEditorKey((value) => value + 1);
    setStatus(`Editing ${record.name}`);
  };

  const newDocument = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Start a new letter anyway?")) return;
    const next = emptyLetterheadDraft();
    setDraft(next);
    setLastSaved(comparableDraft(next));
    setEditorKey((value) => value + 1);
    setStatus("New letter started");
  };

  const reset = () => {
    if (!isDirty || window.confirm("Reset this letter to its last saved version?")) {
      const source = draft.id ? documents.find((record) => record.id === draft.id) : null;
      const next = source ? draftFromRecord(source) : emptyLetterheadDraft();
      setDraft(next);
      setLastSaved(comparableDraft(next));
      setEditorKey((value) => value + 1);
      setStatus("Changes reset");
    }
  };

  const save = async () => {
    setIsSaving(true);
    setStatus("Saving draft…");
    const result = await saveLetterheadAction(draft);
    setIsSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      toast.error(result.error);
      return;
    }
    const saved = result.data;
    setDraft(saved);
    setLastSaved(comparableDraft(saved));
    setEditorKey((value) => value + 1);
    setDocuments((current) => [saved, ...current.filter((record) => record.id !== saved.id)]);
    setStatus("Draft saved");
    toast.success("Letter saved as a draft");
  };

  const duplicate = async (record: LetterheadRecord) => {
    const result = await duplicateLetterheadAction(record.id);
    if (!result.ok) return toast.error(result.error);
    setDocuments((current) => [result.data, ...current]);
    setDraft(result.data);
    setLastSaved(comparableDraft(result.data));
    setEditorKey((value) => value + 1);
    toast.success("Letter duplicated");
  };

  const remove = async (record: LetterheadRecord) => {
    if (!window.confirm(`Delete “${record.name}”? This cannot be undone.`)) return;
    const result = await deleteLetterheadAction(record.id);
    if (!result.ok) return toast.error(result.error);
    setDocuments((current) => current.filter((item) => item.id !== record.id));
    if (draft.id === record.id) newDocument();
    toast.success("Letter deleted");
  };

  const uploadSignature = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setStatus("Upload a PNG, JPG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setStatus("Signature images must be 2 MB or smaller.");
    setIsUploading(true);
    setStatus("Uploading signature…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/letterheads/signature", { method: "POST", body: formData });
      const result = (await response.json()) as { key?: string; mimeType?: string; url?: string; error?: string };
      if (!response.ok || !result.key || !result.url) throw new Error(result.error || "Signature upload failed.");
      setDraft((current) => ({ ...current, signatureKey: result.key!, signatureMimeType: result.mimeType ?? file.type, signatureUrl: result.url! }));
      setStatus("Signature uploaded");
      toast.success("Signature uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signature upload failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const download = async () => {
    setIsGenerating(true);
    setStatus("Generating PDF…");
    try {
      await downloadLetterheadPdf(draft, company, paginateBodyHtml(draft.bodyHtml));
      setStatus("PDF downloaded");
      toast.success("PDF downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF generation failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSaved = async (record: LetterheadRecord) => {
    setIsGenerating(true);
    setStatus("Generating PDF…");
    try {
      await downloadLetterheadPdf(record, company, paginateBodyHtml(record.bodyHtml));
      setStatus("PDF downloaded");
      toast.success("PDF downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF generation failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="letterhead-workspace">
      <section className="letterhead-library" aria-labelledby="saved-letters-title">
        <div className="letterhead-library-heading">
          <div>
            <p className="letterhead-eyebrow">Workspace</p>
            <h2 id="saved-letters-title">Saved letters</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={newDocument}><FilePlus2 className="size-4" /> New letter</Button>
        </div>
        {documents.length ? (
          <div className="letterhead-document-list">
            {documents.map((record) => (
              <div key={record.id} className={`letterhead-document-row ${draft.id === record.id ? "is-selected" : ""}`}>
                <button type="button" className="letterhead-document-main" onClick={() => openDocument(record)}>
                  <FileText className="size-4 shrink-0" />
                  <span className="min-w-0 text-left"><strong className="block truncate">{record.name}</strong><small>Created {new Date(record.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · edited {new Date(record.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></span>
                </button>
                <div className="letterhead-row-actions">
                  <button type="button" onClick={() => downloadSaved(record)} aria-label={`Download ${record.name} as PDF`} title="Download PDF"><Download className="size-4" /></button>
                  <button type="button" onClick={() => duplicate(record)} aria-label={`Duplicate ${record.name}`} title="Duplicate"><Copy className="size-4" /></button>
                  <button type="button" onClick={() => remove(record)} aria-label={`Delete ${record.name}`} title="Delete"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="letterhead-empty">No saved letters yet. Start a new draft below.</p>}
      </section>

      <div className="letterhead-mobile-tabs" role="tablist" aria-label="Letterhead workspace view">
        <button type="button" role="tab" aria-selected={activePanel === "editor"} onClick={() => setActivePanel("editor")}>Editor</button>
        <button type="button" role="tab" aria-selected={activePanel === "preview"} onClick={() => setActivePanel("preview")}>PDF Preview</button>
      </div>

      <div className="letterhead-split">
        <section className={`letterhead-editor-panel ${activePanel === "editor" ? "mobile-visible" : "mobile-hidden"}`} aria-labelledby="letter-editor-title">
          <div className="letterhead-panel-heading">
            <div><p className="letterhead-eyebrow">Document editor</p><h2 id="letter-editor-title">Letter details</h2></div>
            <span className="letterhead-status" role="status" aria-live="polite">{status || (isDirty ? "Unsaved changes" : "Ready")}</span>
          </div>
          <div className="letterhead-form-grid">
            <Field label="Document name" required><Input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Vendor appointment letter" /></Field>
            <Field label="Reference number"><Input value={draft.referenceNumber} onChange={(event) => update("referenceNumber", event.target.value)} placeholder="EVG/2026/001" /></Field>
            <Field label="Date" required><Input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></Field>
            <div className="letterhead-field-full letterhead-recipient-fields"><div className="letterhead-section-caption"><span>To</span><small>Who should receive this letter?</small></div><Field label="Recipient name"><Input value={draft.recipientName} onChange={(event) => update("recipientName", event.target.value)} placeholder="Recipient or company name" /></Field><Field label="Recipient address"><Textarea rows={3} value={draft.recipientAddress} onChange={(event) => update("recipientAddress", event.target.value)} placeholder="Address line 1&#10;City, State, PIN" /></Field></div>
            <div className="letterhead-field-full"><Field label="Subject"><Input value={draft.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Subject of this letter" /></Field></div>
          </div>

          <div className="letterhead-rich-field">
            <div className="letterhead-field-label-row"><label id="body-label">Letter body</label><select aria-label="Paragraph spacing" value={draft.paragraphSpacing} onChange={(event) => update("paragraphSpacing", Number(event.target.value))}><option value={8}>Tight spacing</option><option value={12}>Standard spacing</option><option value={16}>Relaxed spacing</option><option value={24}>Wide spacing</option></select></div>
            <RichToolbar />
            <LetterBodyEditor html={draft.bodyHtml} resetKey={editorKey} onChange={updateBody} />
            <p className="letterhead-helper">Select text to format it. Lists, alignment and paragraph spacing are reflected in the preview.</p>
          </div>

          <div className="letterhead-form-grid letterhead-signoff-grid">
            <Field label="Closing text"><Input value={draft.closing} onChange={(event) => update("closing", event.target.value)} placeholder="Sincerely," /></Field>
            <Field label="Authorized person"><Input value={draft.authorizedName} onChange={(event) => update("authorizedName", event.target.value)} placeholder="Full name" /></Field>
            <Field label="Designation"><Input value={draft.designation} onChange={(event) => update("designation", event.target.value)} placeholder="Designation" /></Field>
            <div className="letterhead-field-full"><SignatureField draft={draft} update={update} uploading={isUploading} onUpload={uploadSignature} /></div>
          </div>

          <div className="letterhead-form-actions"><Button type="button" variant="outline" onClick={reset}><RotateCcw className="size-4" /> Reset</Button><Button type="button" onClick={save} disabled={isSaving || !draft.name.trim()}><Save className="size-4" /> {isSaving ? "Saving…" : "Save draft"}</Button></div>
        </section>

        <section className={`letterhead-preview-panel ${activePanel === "preview" ? "mobile-visible" : "mobile-hidden"}`} aria-labelledby="letter-preview-title">
          <div className="letterhead-preview-toolbar">
            <div><p className="letterhead-eyebrow">Live output</p><h2 id="letter-preview-title">PDF preview</h2></div>
            <Button type="button" onClick={download} disabled={isGenerating}><Download className="size-4" /> {isGenerating ? "Generating…" : "Download PDF"}</Button>
          </div>
          <div className="letterhead-preview-controls"><span>{bodyPages.length} {bodyPages.length === 1 ? "page" : "pages"}</span><div><button type="button" onClick={() => setZoom((value) => Math.max(0.58, Number((value - 0.08).toFixed(2))))} aria-label="Zoom out" title="Zoom out"><Minus className="size-4" /></button><button type="button" onClick={() => setZoom(0.68)} className="letterhead-fit-button">Fit to page</button><button type="button" onClick={() => setZoom((value) => Math.min(0.98, Number((value + 0.08).toFixed(2))))} aria-label="Zoom in" title="Zoom in"><Plus className="size-4" /></button></div></div>
          <div className="letterhead-preview-scroll"><LetterDocument draft={previewDraft} company={company} bodyPages={bodyPages} zoom={zoom} /></div>
          <p className="letterhead-preview-note">A4 portrait · searchable text · watermark and footer repeat on every page</p>
        </section>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="letterhead-field"><span>{label}{required && <span aria-hidden="true"> *</span>}</span>{children}</label>;
}

const LetterBodyEditor = memo(function LetterBodyEditor({ html, resetKey, onChange }: { html: string; resetKey: number; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef(html);

  useLayoutEffect(() => {
    htmlRef.current = html;
  }, [html]);

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = safeLetterBodyHtml(htmlRef.current);
  }, [resetKey]);

  return <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-labelledby="body-label" aria-multiline="true" className="letterhead-rich-editor" onInput={(event) => onChange(event.currentTarget.innerHTML)} />;
}, (previous, next) => previous.resetKey === next.resetKey && previous.onChange === next.onChange);

function RichToolbar() {
  const command = (name: string, value?: string) => document.execCommand(name, false, value);
  const control = (label: string, name: string, value?: string) => <button type="button" aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(name, value)}>{label.split(" ")[0]}</button>;
  return <div className="letterhead-rich-toolbar" role="toolbar" aria-label="Letter formatting"><span>{control("Bold", "bold")}{control("Italic", "italic")}{control("Underline", "underline")}</span><span>{control("Left", "justifyLeft")}{control("Center", "justifyCenter")}{control("Right", "justifyRight")}</span><span>{control("Bulleted", "insertUnorderedList")}{control("Numbered", "insertOrderedList")}</span></div>;
}

/* eslint-disable @next/next/no-img-element -- uploaded signatures need their private authenticated URL. */
function SignatureField({ draft, update, uploading, onUpload }: { draft: LetterheadDraft; update: <K extends keyof LetterheadDraft>(key: K, value: LetterheadDraft[K]) => void; uploading: boolean; onUpload: (file: File) => void }) {
  return <div className="letterhead-signature-field"><div className="letterhead-field-label-row"><label>Signature</label>{draft.signatureKey && <button type="button" className="letterhead-remove-signature" onClick={() => { update("signatureKey", null); update("signatureMimeType", null); update("signatureUrl", null); }}> <X className="size-3" /> Remove</button>}</div><div className="letterhead-signature-upload">{draft.signatureUrl ? <div className="letterhead-signature-preview"><img src={draft.signatureUrl} alt="Uploaded signature preview" /><label className="letterhead-upload-replace"><Upload className="size-4" /> Replace<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label></div> : <label className="letterhead-upload-drop"><ImagePlus className="size-5" /><span>{uploading ? "Uploading…" : "Upload a signature"}</span><small>PNG, JPG or WebP · max 2 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label>}{draft.signatureUrl && <label className="letterhead-signature-size">Width <input type="range" min={80} max={260} step={5} value={draft.signatureWidth ?? 150} onChange={(event) => update("signatureWidth", Number(event.target.value))} /><output>{draft.signatureWidth ?? 150}px</output></label>}</div></div>;
}
/* eslint-enable @next/next/no-img-element */
