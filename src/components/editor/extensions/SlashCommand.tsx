"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { cn } from "@/lib/utils";
import { filterBlocks, type BlockContext, type BlockItem } from "../blocks";

type MenuHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };
type MenuProps = { items: BlockItem[]; command: (item: BlockItem) => void };

const SlashMenu = forwardRef<MenuHandle, MenuProps>(function SlashMenu({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        if (items[index]) command(items[index]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return <div className="rounded-lg border border-line bg-white p-3 text-sm text-muted-foreground shadow-xl">No matching blocks</div>;
  }
  return (
    <div role="listbox" aria-label="Insert block" className="max-h-80 w-72 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-xl">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === index}
          onMouseEnter={() => setIndex(i)}
          onClick={() => command(item)}
          className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left", i === index && "bg-paper-2")}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-white text-evergreen-700">
            <item.icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-evergreen-700">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

/** Type "/" at the start of a line to open the block menu. */
export const SlashCommand = Extension.create<{ getContext: () => BlockContext }>({
  name: "slashCommand",
  addOptions() {
    return { getContext: () => ({ pickMedia: async () => null }) };
  },
  addProseMirrorPlugins() {
    const getContext = this.options.getContext;
    return [
      Suggestion<BlockItem, BlockItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        startOfLine: true,
        items: ({ query }) => filterBlocks(query),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: BlockItem }) => {
          editor.chain().focus().deleteRange(range).run();
          void props.run(editor, getContext());
        },
        render: () => {
          let renderer: ReactRenderer<MenuHandle, MenuProps> | null = null;
          let popup: HTMLDivElement | null = null;
          const place = (props: SuggestionProps<BlockItem, BlockItem>) => {
            const rect = props.clientRect?.();
            if (!rect || !popup) return;
            const below = rect.bottom + 8;
            const fitsBelow = below + 320 < window.innerHeight;
            popup.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
            popup.style.top = fitsBelow ? `${below}px` : `${Math.max(8, rect.top - 328)}px`;
          };
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenu, { props, editor: props.editor });
              popup = document.createElement("div");
              popup.style.position = "fixed";
              popup.style.zIndex = "60";
              popup.appendChild(renderer.element);
              document.body.appendChild(popup);
              place(props);
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              place(props);
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                popup = null;
                return true;
              }
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.remove();
              renderer?.destroy();
              popup = null;
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
