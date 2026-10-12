"use client";

import { Node, createAtomBlockMarkdownSpec } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { HelpCircle, ListChecks, ListTree } from "lucide-react";
import { NODES } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { useEditorData } from "../EditorDataContext";

// Marker blocks: their content comes from post fields (AI SEO tab) or from the headings, and
// is rendered at this position in the article. Each may appear once per document.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    syncedBlocks: { insertSyncedBlock: (type: (typeof SYNCED)[number]) => ReturnType };
  }
}

const SYNCED = [NODES.keyTakeaways, NODES.faq, NODES.toc] as const;

function Frame({ selected, title, icon: Icon, children, action }: { selected: boolean; title: string; icon: typeof ListTree; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <NodeViewWrapper contentEditable={false} data-drag-handle className={cn("my-4 rounded-lg border border-dashed border-evergreen-600/60 bg-evergreen-700/5 p-4", selected && "ring-2 ring-evergreen-600")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-moss-ink">
          <Icon className="size-4" aria-hidden />
          {title}
        </p>
        {action}
      </div>
      <div className="text-sm text-evergreen-700">{children}</div>
    </NodeViewWrapper>
  );
}

function EditLink({ label }: { label: string }) {
  const { openAiSeoTab } = useEditorData();
  return (
    <button type="button" onClick={openAiSeoTab} className="text-xs font-medium text-moss-ink underline">
      {label}
    </button>
  );
}

function KeyTakeawaysView({ selected }: ReactNodeViewProps) {
  const { keyTakeaways } = useEditorData();
  const items = keyTakeaways.filter((t) => t.trim());
  return (
    <Frame selected={selected} title="Key takeaways (synced)" icon={ListChecks} action={<EditLink label="Edit in AI SEO tab" />}>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
      ) : (
        <p className="text-muted-foreground">No takeaways yet. Add 3–7 in the AI SEO tab.</p>
      )}
    </Frame>
  );
}

function FaqView({ selected }: ReactNodeViewProps) {
  const { faqs } = useEditorData();
  const items = faqs.filter((f) => f.question.trim());
  return (
    <Frame selected={selected} title="FAQ (synced)" icon={HelpCircle} action={<EditLink label="Edit in AI SEO tab" />}>
      {items.length ? (
        <ol className="list-decimal space-y-1 pl-5">{items.map((f, i) => <li key={i} className="font-medium">{f.question}</li>)}</ol>
      ) : (
        <p className="text-muted-foreground">No questions yet. Add them in the AI SEO tab.</p>
      )}
    </Frame>
  );
}

function TocView({ selected }: ReactNodeViewProps) {
  const { headings } = useEditorData();
  return (
    <Frame selected={selected} title="Table of contents (auto)" icon={ListTree}>
      {headings.length ? (
        <ul className="space-y-0.5">
          {headings.map((h) => (
            <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 16}px` }}>{h.text}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Generated from your H2–H4 headings.</p>
      )}
    </Frame>
  );
}

function markerNode(name: string, mdName: string, view: (p: ReactNodeViewProps) => React.ReactElement) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    parseHTML() {
      return [{ tag: `div[data-block="${name}"]` }];
    },
    renderHTML() {
      return ["div", { "data-block": name }];
    },
    addNodeView() {
      return ReactNodeViewRenderer(view);
    },
    ...createAtomBlockMarkdownSpec({ nodeName: name, name: mdName }),
  });
}

export const KeyTakeawaysBlock = markerNode(NODES.keyTakeaways, "keyTakeaways", KeyTakeawaysView).extend({
  addCommands() {
    return {
      insertSyncedBlock:
        (type) =>
        ({ state, commands }) => {
          let exists = false;
          state.doc.descendants((n) => {
            if (n.type.name === type) exists = true;
            return !exists;
          });
          return exists ? false : commands.insertContent({ type });
        },
    };
  },
});
export const FaqBlock = markerNode(NODES.faq, "faq", FaqView);
export const TocBlock = markerNode(NODES.toc, "toc", TocView);
