"use client";

import type { Editor } from "@tiptap/core";
import {
  AlertTriangle,
  Code2,
  FileText,
  Heading2,
  Heading3,
  Heading4,
  HelpCircle,
  ImageIcon,
  Info,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Minus,
  Quote,
  Table,
  TextQuote,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { NODES } from "@/lib/content/types";
import { pickVariantUrl, type MediaItem } from "@/lib/media/types";

export type BlockContext = { pickMedia: () => Promise<MediaItem | null> };

export type BlockItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor, ctx: BlockContext) => void | Promise<void>;
};

async function insertMediaImage(editor: Editor, ctx: BlockContext) {
  const media = await ctx.pickMedia();
  if (!media) return;
  editor
    .chain()
    .focus()
    .insertContent({
      type: "image",
      attrs: {
        src: pickVariantUrl(media, 1280),
        alt: media.alt,
        title: media.title || null,
        caption: media.caption,
        mediaId: media.id,
        width: media.width || null,
        height: media.height || null,
      },
    })
    .run();
}

/** Block catalogue shared by the slash menu and the toolbar's "Insert" menu. */
export const BLOCKS: BlockItem[] = [
  { id: "h2", title: "Heading 2", description: "Main section", icon: Heading2, keywords: ["h2", "title"], run: (e) => void e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3", title: "Heading 3", description: "Sub-section", icon: Heading3, keywords: ["h3"], run: (e) => void e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "h4", title: "Heading 4", description: "Minor heading", icon: Heading4, keywords: ["h4"], run: (e) => void e.chain().focus().setHeading({ level: 4 }).run() },
  { id: "bullets", title: "Bulleted list", description: "Unordered list", icon: List, keywords: ["ul", "bullet"], run: (e) => void e.chain().focus().toggleBulletList().run() },
  { id: "numbers", title: "Numbered list", description: "Ordered steps", icon: ListOrdered, keywords: ["ol", "number", "steps"], run: (e) => void e.chain().focus().toggleOrderedList().run() },
  { id: "quote", title: "Blockquote", description: "Plain quotation", icon: TextQuote, keywords: ["blockquote"], run: (e) => void e.chain().focus().toggleBlockquote().run() },
  { id: "table", title: "Table", description: "3×3 table with header row", icon: Table, keywords: ["grid"], run: (e) => void e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "hr", title: "Divider", description: "Horizontal rule", icon: Minus, keywords: ["hr", "line", "separator"], run: (e) => void e.chain().focus().setHorizontalRule().run() },
  { id: "code", title: "Code block", description: "Syntax highlighted", icon: Code2, keywords: ["code", "snippet"], run: (e) => void e.chain().focus().setCodeBlock({ language: "plaintext" }).run() },
  { id: "image", title: "Image", description: "From the Media Library", icon: ImageIcon, keywords: ["picture", "photo", "media"], run: insertMediaImage },
  { id: "video", title: "YouTube video", description: "Lightweight embed", icon: Youtube, keywords: ["youtube", "embed", "video"], run: (e) => void e.chain().focus().insertVideoEmbed().run() },
  { id: "important", title: "Important callout", description: "Key point box", icon: Info, keywords: ["callout", "important"], run: (e) => void e.chain().focus().insertCallout("important").run() },
  { id: "warning", title: "Warning callout", description: "Risk or penalty", icon: AlertTriangle, keywords: ["callout", "warning", "caution"], run: (e) => void e.chain().focus().insertCallout("warning").run() },
  { id: "tip", title: "Tip callout", description: "Helpful advice", icon: Lightbulb, keywords: ["callout", "tip", "hint"], run: (e) => void e.chain().focus().insertCallout("tip").run() },
  { id: "note", title: "Note callout", description: "Side note", icon: FileText, keywords: ["callout", "note", "info"], run: (e) => void e.chain().focus().insertCallout("note").run() },
  { id: "expert", title: "Expert quote", description: "Quote with name and role", icon: Quote, keywords: ["expert", "cite", "testimonial"], run: (e) => void e.chain().focus().insertExpertQuote().run() },
  { id: "takeaways", title: "Key takeaways", description: "Synced with AI SEO tab", icon: ListChecks, keywords: ["summary", "takeaways", "tldr"], run: (e) => void e.chain().focus().insertSyncedBlock(NODES.keyTakeaways).run() },
  { id: "faq", title: "FAQ", description: "Synced with AI SEO tab", icon: HelpCircle, keywords: ["faq", "questions"], run: (e) => void e.chain().focus().insertSyncedBlock(NODES.faq).run() },
  { id: "toc", title: "Table of contents", description: "Auto from headings", icon: ListTree, keywords: ["toc", "contents"], run: (e) => void e.chain().focus().insertSyncedBlock(NODES.toc).run() },
];

export function filterBlocks(query: string): BlockItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return BLOCKS;
  return BLOCKS.filter((b) => b.title.toLowerCase().includes(q) || b.keywords.some((k) => k.includes(q)));
}
