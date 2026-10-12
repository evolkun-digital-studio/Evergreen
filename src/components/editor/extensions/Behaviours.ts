"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Keeps headings within H2–H4. The post title is the page's only H1, so H1s that arrive via
 * paste, Markdown import or keyboard shortcuts are demoted to H2 (and H5/H6 promoted to H4).
 */
export const HeadingLevelClamp = Extension.create({
  name: "headingLevelClamp",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("headingLevelClamp"),
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((t) => t.docChanged)) return null;
          let tr = state.tr;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== "heading") return;
            const level = Number(node.attrs.level);
            const clamped = level < 2 ? 2 : level > 4 ? 4 : level;
            if (clamped !== level) {
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, level: clamped });
              changed = true;
            }
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});

// Heuristic: plain-text clipboard content that is clearly Markdown.
const MARKDOWN_HINTS = [/^#{1,6}\s/m, /^\s*[-*+]\s+\S/m, /^\s*\d+\.\s+\S/m, /^```/m, /\*\*[^*]+\*\*/, /\[[^\]]+\]\([^)]+\)/, /^\|.+\|\s*$/m, /^>\s/m];

function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINTS.filter((rx) => rx.test(text)).length >= 1 && text.includes("\n");
}

/** Pasting Markdown (plain text without HTML) converts it into rich content. */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (_view, event) => {
            const data = event.clipboardData;
            if (!data || data.types.includes("text/html")) return false;
            const text = data.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) return false;
            // Inside a code block, paste literally.
            if (editor.isActive("codeBlock")) return false;
            editor.commands.insertContent(text, { contentType: "markdown" });
            return true;
          },
        },
      }),
    ];
  },
});
