"use client";

import { Node, mergeAttributes, createBlockMarkdownSpec } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { AlertTriangle, FileText, Info, Lightbulb } from "lucide-react";
import { CALLOUT_LABELS, CALLOUT_VARIANTS, NODES, type CalloutVariant } from "@/lib/content/types";
import { cn } from "@/lib/utils";

const CALLOUT_STYLES: Record<CalloutVariant, { icon: typeof Info; className: string }> = {
  important: { icon: Info, className: "border-evergreen-700 bg-evergreen-700/[0.06]" },
  warning: { icon: AlertTriangle, className: "border-amber-600 bg-amber-50" },
  tip: { icon: Lightbulb, className: "border-evergreen-600 bg-evergreen-700/10" },
  note: { icon: FileText, className: "border-evergreen-700/40 bg-paper-2" },
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: { insertCallout: (variant?: CalloutVariant) => ReturnType };
  }
}

function CalloutView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const variant = (node.attrs.variant as CalloutVariant) ?? "note";
  const style = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.note;
  const Icon = style.icon;
  return (
    <NodeViewWrapper className={cn("my-4 flex gap-3 rounded-lg border-l-4 p-4", style.className)}>
      <Icon className="mt-0.5 size-5 shrink-0 text-evergreen-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <div contentEditable={false} className="mb-1 flex items-center gap-2">
          <select
            aria-label="Callout type"
            value={variant}
            disabled={!editor.isEditable}
            onChange={(e) => updateAttributes({ variant: e.target.value })}
            className="rounded border border-line bg-white px-1.5 py-0.5 text-xs font-semibold text-evergreen-700"
          >
            {CALLOUT_VARIANTS.map((v) => (
              <option key={v} value={v}>
                {CALLOUT_LABELS[v]}
              </option>
            ))}
          </select>
          <input
            aria-label="Callout title (optional)"
            placeholder={`Title (default: ${CALLOUT_LABELS[variant]})`}
            value={(node.attrs.title as string) ?? ""}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-evergreen-700 outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
        </div>
        <NodeViewContent className="callout-content [&>p:last-child]:mb-0" />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: NODES.callout,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: { default: "note" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]", getAttrs: (el) => ({ variant: (el as HTMLElement).dataset.callout ?? "note" }) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes({ "data-callout": HTMLAttributes.variant }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      insertCallout:
        (variant = "note") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { variant }, content: [{ type: "paragraph" }] }),
    };
  },

  ...createBlockMarkdownSpec({ nodeName: NODES.callout, name: "callout", allowedAttributes: ["variant", "title"] }),
});
