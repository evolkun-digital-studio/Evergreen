"use client";

import { useId, useRef, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- Character counter ------------------------------------------------------------------------

export function CharCount({ value, min, max, hardMax }: { value: string; min?: number; max: number; hardMax?: number }) {
  const n = value.length;
  const tone =
    (hardMax && n > hardMax) || n > max * 1.15 ? "text-destructive" : (min && n < min) || n > max ? "text-amber-700" : "text-moss-ink";
  return (
    <span className={cn("text-xs tabular-nums", n === 0 ? "text-muted-foreground" : tone)}>
      {n}
      {min ? ` / ${min}–${max}` : ` / ${max}`}
    </span>
  );
}

// --- Chips (tags, keywords) -------------------------------------------------------------------

type Chip = { id?: string; name: string };

export function ChipsInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  max = 20,
  label,
}: {
  value: Chip[];
  onChange: (next: Chip[]) => void;
  suggestions?: Chip[];
  placeholder?: string;
  max?: number;
  label: string;
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const has = (name: string) => value.some((c) => c.name.toLowerCase() === name.toLowerCase());
  const matches = text.trim()
    ? suggestions.filter((s) => s.name.toLowerCase().includes(text.trim().toLowerCase()) && !has(s.name)).slice(0, 8)
    : [];

  const add = (chip: Chip) => {
    const name = chip.name.trim();
    if (!name || has(name) || value.length >= max) return;
    const existing = suggestions.find((s) => s.name.toLowerCase() === name.toLowerCase());
    onChange([...value, existing ?? { ...chip, name }]);
    setText("");
  };

  return (
    <div className="relative">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-white px-2 py-1.5 focus-within:border-evergreen-600 focus-within:ring-2 focus-within:ring-evergreen-600/20"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((c) => (
          <span key={c.name} className="inline-flex items-center gap-1 rounded-full bg-paper-2 py-0.5 pl-2.5 pr-1 text-xs text-evergreen-700">
            {c.name}
            {!c.id && suggestions.length > 0 && <span className="text-[10px] text-moss-ink">new</span>}
            <button type="button" aria-label={`Remove ${c.name}`} onClick={() => onChange(value.filter((x) => x.name !== c.name))} className="rounded-full p-0.5 hover:bg-white">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          aria-label={label}
          aria-controls={listId}
          value={text}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add({ name: text });
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => text.trim() && add({ name: text })}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-evergreen-700 outline-none placeholder:text-muted-foreground"
        />
      </div>
      {matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-line bg-white py-1 shadow-lg">
          {matches.map((m) => (
            <li key={m.name}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)} className="w-full px-3 py-1.5 text-left text-sm text-evergreen-700 hover:bg-paper-2">
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Sortable repeater (native drag & drop + keyboard-accessible move buttons) ----------------

export function SortableList<T>({
  items,
  onChange,
  render,
  create,
  addLabel,
  max,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, update: (next: T) => void, index: number) => React.ReactNode;
  create: () => T;
  addLabel: string;
  max?: number;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom !== null) move(dragFrom, i);
            setDragFrom(null);
          }}
          className={cn("flex gap-2 rounded-lg border border-line bg-white p-2", dragFrom === i && "opacity-50")}
        >
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden />
            <button type="button" className="text-[10px] text-muted-foreground hover:text-evergreen-700 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
              ▲
            </button>
            <button type="button" className="text-[10px] text-muted-foreground hover:text-evergreen-700 disabled:opacity-30" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
              ▼
            </button>
          </div>
          <div className="min-w-0 flex-1">{render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))), i)}</div>
          <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="self-start rounded p-1 text-muted-foreground hover:bg-paper-2 hover:text-destructive">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={max !== undefined && items.length >= max} onClick={() => onChange([...items, create()])}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  );
}
