"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  FileCode2,
  FileDown,
  Plus,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Columns3,
  Rows3,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BLOCKS, type BlockContext } from "./blocks";
import { LinkPopover } from "./LinkPopover";

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md text-evergreen-700 hover:bg-paper-2 disabled:opacity-40",
        active && "bg-paper-2 text-moss-ink",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" aria-hidden />;

type Props = {
  editor: Editor;
  ctx: BlockContext;
  markdownMode: boolean;
  onToggleMarkdown: () => void;
};

export function Toolbar({ editor, ctx, markdownMode, onToggleMarkdown }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const disabled = markdownMode;

  return (
    <div className="sticky top-[6.75rem] z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-white/95 px-2 py-1.5 backdrop-blur" role="toolbar" aria-label="Formatting">
      <select
        aria-label="Text style"
        disabled={disabled}
        value={s.h2 ? "2" : s.h3 ? "3" : s.h4 ? "4" : "p"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") chain().setParagraph().run();
          else chain().setHeading({ level: Number(v) as 2 | 3 | 4 }).run();
        }}
        className="h-8 rounded-md border border-line bg-white px-2 text-sm text-evergreen-700"
      >
        <option value="p">Paragraph</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
        <Bold className="size-4" />
      </Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()}>
        <Underline className="size-4" />
      </Btn>
      <Btn label="Strikethrough" active={s.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </Btn>
      <Btn label="Inline code" active={s.code} disabled={disabled} onClick={() => chain().toggleCode().run()}>
        <Code className="size-4" />
      </Btn>
      {!disabled && <LinkPopover editor={editor} />}
      <Sep />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-evergreen-700">
            <Plus className="size-4" /> Insert
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[70vh] w-64 overflow-y-auto">
          {BLOCKS.map((b, i) => (
            <div key={b.id}>
              {(i === 3 || i === 9 || i === 11 || i === 16) && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => void b.run(editor, ctx)}>
                <b.icon className="size-4" />
                <span className="flex-1">{b.title}</span>
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {s.inTable && !disabled && (
        <>
          <Sep />
          <Btn label="Add column" onClick={() => chain().addColumnAfter().run()}>
            <Columns3 className="size-4" />
          </Btn>
          <Btn label="Add row" onClick={() => chain().addRowAfter().run()}>
            <Rows3 className="size-4" />
          </Btn>
          <Btn label="Delete table" onClick={() => chain().deleteTable().run()}>
            <Trash2 className="size-4" />
          </Btn>
        </>
      )}
      <Sep />
      <Btn label="Undo (Ctrl+Z)" disabled={disabled || !s.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="size-4" />
      </Btn>
      <Btn label="Redo (Ctrl+Shift+Z)" disabled={disabled || !s.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="size-4" />
      </Btn>
      <div className="ml-auto flex items-center gap-1">
        <Btn label="Import Markdown" disabled={disabled} onClick={() => setImportOpen(true)}>
          <FileDown className="size-4" />
        </Btn>
        <Button type="button" variant={markdownMode ? "default" : "ghost"} size="sm" className="h-8 gap-1" onClick={onToggleMarkdown}>
          <FileCode2 className="size-4" /> Markdown
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Markdown</DialogTitle>
            <DialogDescription>Paste Markdown; it&apos;s inserted at the cursor. A leading “# Title” becomes an H2 (the post title is the H1).</DialogDescription>
          </DialogHeader>
          <Textarea rows={14} value={markdown} onChange={(e) => setMarkdown(e.target.value)} className="font-mono text-sm" placeholder={"## Section\n\nSome **bold** text and a [link](https://cpcb.nic.in)."} />
          <DialogFooter>
            <Button
              type="button"
              disabled={!markdown.trim()}
              onClick={() => {
                editor.chain().focus().insertContent(markdown, { contentType: "markdown" }).run();
                setMarkdown("");
                setImportOpen(false);
              }}
            >
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
