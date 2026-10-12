"use client";

import CodeBlock from "@tiptap/extension-code-block";
import Image from "@tiptap/extension-image";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { AlertCircle } from "lucide-react";
import { CODE_LANGUAGES } from "@/lib/content/types";
import { cn } from "@/lib/utils";

// --- Code block: language selector + optional filename; highlighting happens on the server ----

function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="my-4 overflow-hidden rounded-lg border border-line bg-[#f6f8fa]">
      <div contentEditable={false} className="flex items-center gap-2 border-b border-line bg-white px-3 py-1.5">
        <select
          aria-label="Code language"
          value={(node.attrs.language as string) || "plaintext"}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="rounded border border-line bg-white px-1.5 py-0.5 text-xs text-evergreen-700"
        >
          {CODE_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Filename (optional)"
          placeholder="filename.ext (optional)"
          value={(node.attrs.filename as string) ?? ""}
          onChange={(e) => updateAttributes({ filename: e.target.value })}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-evergreen-700 outline-none"
        />
      </div>
      <pre className="m-0 overflow-x-auto p-4 font-mono text-sm leading-relaxed text-[#24292e]">
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

export const CodeBlockWithMeta = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: "plaintext",
        parseHTML: (el) => el.querySelector("code")?.className.match(/language-(\S+)/)?.[1] ?? "plaintext",
      },
      filename: { default: "" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ defaultLanguage: "plaintext", enableTabIndentation: true });

// --- Content image: media-library backed, alt text required, optional caption -----------------

function ImageView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const a = node.attrs as { src: string; alt: string; caption: string; width: number | null; height: number | null };
  const missingAlt = !a.alt?.trim();
  return (
    <NodeViewWrapper as="figure" className={cn("my-5", selected && "rounded-lg ring-2 ring-evergreen-600 ring-offset-2")} data-drag-handle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.src} alt={a.alt} width={a.width ?? undefined} height={a.height ?? undefined} className="mx-auto h-auto max-h-[480px] w-auto rounded-md" draggable={false} />
      <div contentEditable={false} className="mt-2 space-y-1.5">
        <input
          aria-label="Alt text (required)"
          aria-invalid={missingAlt}
          placeholder="Alt text: describe the image for screen readers and search (required)"
          value={a.alt ?? ""}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          className={cn(
            "w-full rounded-md border bg-white px-2.5 py-1.5 text-sm text-evergreen-700 outline-none",
            missingAlt ? "border-destructive" : "border-line focus:border-evergreen-600",
          )}
        />
        {missingAlt && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3.5" /> Alt text is required before publishing.
          </p>
        )}
        <input
          aria-label="Caption (optional)"
          placeholder="Caption (optional)"
          value={a.caption ?? ""}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          className="w-full bg-transparent text-center text-sm text-muted-foreground outline-none"
        />
      </div>
    </NodeViewWrapper>
  );
}

export const ContentImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null },
      caption: { default: "" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({ inline: false, allowBase64: false });
