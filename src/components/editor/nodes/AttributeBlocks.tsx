"use client";

import { Node, createAtomBlockMarkdownSpec } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { Quote, Youtube } from "lucide-react";
import { NODES, youtubeId } from "@/lib/content/types";
import { cn } from "@/lib/utils";

// Atom blocks whose content lives in attributes and is edited through small inline forms.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attributeBlocks: {
      insertExpertQuote: () => ReturnType;
      insertVideoEmbed: (url?: string) => ReturnType;
    };
  }
}

const inputClass =
  "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-evergreen-700 outline-none focus:border-evergreen-600 focus:ring-2 focus:ring-evergreen-600/20";

function Shell({ selected, icon: Icon, label, children }: { selected: boolean; icon: typeof Quote; label: string; children: React.ReactNode }) {
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn("my-4 rounded-lg border border-line bg-paper-2/60 p-4", selected && "ring-2 ring-evergreen-600")}
      data-drag-handle
    >
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-moss-ink">
        <Icon className="size-4" aria-hidden />
        {label}
      </p>
      {children}
    </NodeViewWrapper>
  );
}

// --- Expert quote ------------------------------------------------------------------------------

function ExpertQuoteView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const a = node.attrs as { quote: string; name: string; role: string; sourceUrl: string };
  return (
    <Shell selected={selected} icon={Quote} label="Expert quote">
      <textarea
        aria-label="Quote"
        rows={3}
        placeholder="The quotation, word for word…"
        value={a.quote}
        onChange={(e) => updateAttributes({ quote: e.target.value })}
        className={cn(inputClass, "font-display text-base")}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input aria-label="Person name" placeholder="Name, e.g. John Mueller" value={a.name} onChange={(e) => updateAttributes({ name: e.target.value })} className={inputClass} />
        <input aria-label="Role or organisation" placeholder="Role / organisation" value={a.role} onChange={(e) => updateAttributes({ role: e.target.value })} className={inputClass} />
        <input aria-label="Source URL" placeholder="Source URL (optional)" value={a.sourceUrl} onChange={(e) => updateAttributes({ sourceUrl: e.target.value })} className={inputClass} />
      </div>
      {!a.quote.trim() && <p className="mt-2 text-xs text-destructive">Empty quotes are not published.</p>}
    </Shell>
  );
}

export const ExpertQuote = Node.create({
  name: NODES.expertQuote,
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { quote: { default: "" }, name: { default: "" }, role: { default: "" }, sourceUrl: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "figure[data-expert-quote]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", { "data-expert-quote": "" }, ["blockquote", {}, HTMLAttributes.quote ?? ""]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ExpertQuoteView);
  },
  addCommands() {
    return {
      insertExpertQuote:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
  ...createAtomBlockMarkdownSpec({ nodeName: NODES.expertQuote, name: "expertQuote", allowedAttributes: ["quote", "name", "role", "sourceUrl"] }),
});

// --- Video embed (YouTube, rendered as a lite facade on the site) ------------------------------

function VideoEmbedView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const a = node.attrs as { url: string; title: string };
  const id = youtubeId(a.url);
  return (
    <Shell selected={selected} icon={Youtube} label="YouTube video">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <input aria-label="YouTube URL" placeholder="https://www.youtube.com/watch?v=…" value={a.url} onChange={(e) => updateAttributes({ url: e.target.value })} className={inputClass} />
        <input aria-label="Video title" placeholder="Video title (used in VideoObject schema)" value={a.title} onChange={(e) => updateAttributes({ title: e.target.value })} className={inputClass} />
      </div>
      {id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="mt-3 aspect-video w-full max-w-sm rounded-md object-cover" />
      ) : (
        a.url && <p className="mt-2 text-xs text-destructive">That doesn&apos;t look like a YouTube link.</p>
      )}
    </Shell>
  );
}

export const VideoEmbed = Node.create({
  name: NODES.videoEmbed,
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { url: { default: "" }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "figure[data-video-embed]", getAttrs: (el) => ({ url: (el as HTMLElement).dataset.videoEmbed ?? "" }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", { "data-video-embed": HTMLAttributes.url ?? "" }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedView);
  },
  addCommands() {
    return {
      insertVideoEmbed:
        (url = "") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { url } }),
    };
  },
  ...createAtomBlockMarkdownSpec({ nodeName: NODES.videoEmbed, name: "video", allowedAttributes: ["url", "title"] }),
});
