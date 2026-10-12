"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LegacyItalic } from "./extensions/LegacyItalic";
import { TableKit } from "@tiptap/extension-table";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import type { JSONContent } from "@tiptap/core";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "./nodes/Callout";
import { ExpertQuote, VideoEmbed } from "./nodes/AttributeBlocks";
import { FaqBlock, KeyTakeawaysBlock, TocBlock } from "./nodes/SyncedBlocks";
import { CodeBlockWithMeta, ContentImage } from "./nodes/CodeAndImage";
import { HeadingLevelClamp, MarkdownPaste } from "./extensions/Behaviours";
import { SlashCommand } from "./extensions/SlashCommand";
import { EditorDataContext, type EditorData } from "./EditorDataContext";
import { Toolbar } from "./Toolbar";

type Props = {
  initialContent: JSONContent;
  data: EditorData;
  onChange: (doc: JSONContent) => void;
};

/**
 * The post body editor. Admin-only: it is imported exclusively from /admin routes, so Tiptap and
 * ProseMirror never reach public bundles.
 */
export function RichTextEditor({ initialContent, data, onChange }: Props) {
  const dataRef = useRef(data);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    dataRef.current = data;
    onChangeRef.current = onChange;
  });
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdown, setMarkdown] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        italic: false, // no italics on the site; LegacyItalic keeps old marks loadable
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: null, target: null },
        },
      }),
      LegacyItalic,
      CodeBlockWithMeta,
      ContentImage,
      TableKit.configure({ table: { resizable: false } }),
      Callout,
      ExpertQuote,
      VideoEmbed,
      KeyTakeawaysBlock,
      FaqBlock,
      TocBlock,
      Placeholder.configure({ placeholder: "Start writing, or type “/” for blocks…" }),
      CharacterCount,
      Markdown,
      HeadingLevelClamp,
      MarkdownPaste,
      // Read on slash-command keystrokes, never during render.
      // eslint-disable-next-line react-hooks/refs
      SlashCommand.configure({ getContext: () => ({ pickMedia: dataRef.current.pickMedia }) }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[60vh] px-6 py-6 outline-none md:px-10",
        "aria-label": "Post content",
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getJSON()),
  });

  const words = useEditorState({ editor, selector: ({ editor: e }) => (e ? (e.storage.characterCount.words() as number) : 0) });

  // Restoring a revision replaces the document from outside.
  const lastInitial = useRef(initialContent);
  useEffect(() => {
    if (editor && initialContent !== lastInitial.current) {
      lastInitial.current = initialContent;
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  const toggleMarkdown = () => {
    if (!editor) return;
    if (!markdownMode) {
      setMarkdown(editor.getMarkdown());
      setMarkdownMode(true);
    } else {
      editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: true });
      setMarkdownMode(false);
    }
  };

  return (
    <EditorDataContext.Provider value={data}>
      <div className="rounded-xl border border-line bg-white">
        {editor ? (
          <Toolbar editor={editor} ctx={{ pickMedia: data.pickMedia }} markdownMode={markdownMode} onToggleMarkdown={toggleMarkdown} />
        ) : (
          <div className="h-12 border-b border-line" />
        )}
        {markdownMode ? (
          <Textarea
            aria-label="Markdown source"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="min-h-[60vh] rounded-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
        <div className="flex justify-between border-t border-line px-4 py-2 text-xs text-muted-foreground">
          <span>{markdownMode ? "Editing Markdown source. Switch back to apply." : "Type “/” for blocks · Ctrl+K link · Ctrl+S save"}</span>
          <span aria-live="polite">{(words ?? 0).toLocaleString("en-IN")} words</span>
        </div>
      </div>
    </EditorDataContext.Provider>
  );
}
