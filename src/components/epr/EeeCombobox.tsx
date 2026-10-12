"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { itemLabel, type EeeItem } from "@/lib/epr/data";
import { cn } from "@/lib/utils";

/** Searchable EEE picker grouped by Schedule I category. Search matches code, name and sub-type. */
export function EeeCombobox({
  id,
  items,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  items: EeeItem[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);
  const groups = useMemo(() => {
    const map = new Map<string, EeeItem[]>();
    for (const i of items) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return [...map.entries()];
  }, [items]);
  const label = selected ? `${selected.code} · ${itemLabel(selected)}` : "";

  const trigger = (
    <PopoverTrigger asChild>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn("field flex min-h-[50px] items-center justify-between gap-2 text-left", !selected && "text-ink-muted")}
      >
        <span className="line-clamp-1 min-w-0">{selected ? label : "Search by name or code"}</span>
        <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {selected && label.length > 34 ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm text-[13px] leading-snug">
            {label}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverContent align="start" sideOffset={6} className="w-[min(640px,calc(100vw-2rem))] rounded-lg border-line p-0 shadow-[0_16px_40px_-20px_rgba(10,38,22,0.4)]">
        <Command
          filter={(itemValue, search, keywords) => {
            const hay = `${itemValue} ${keywords?.join(" ") ?? ""}`.toLowerCase();
            return search
              .toLowerCase()
              .split(/\s+/)
              .filter(Boolean)
              .every(w => hay.includes(w))
              ? 1
              : 0;
          }}
        >
          <CommandInput placeholder="Type a product or code, e.g. laptop or CEEW4" aria-label="Search EEE items" />
          <CommandList id={`${id}-listbox`}>
            <CommandEmpty>No EEE item matches that search.</CommandEmpty>
            {groups.map(([category, list]) => (
              <CommandGroup key={category} heading={category}>
                {list.map(i => (
                  <CommandItem
                    key={i.id}
                    value={i.id}
                    keywords={[i.code, i.name, i.variant ?? ""]}
                    onSelect={() => {
                      onChange(i.id);
                      setOpen(false);
                    }}
                  >
                    <span className="mt-0.5 w-[4.25rem] shrink-0 font-display text-[13px] font-semibold tabular-nums text-evergreen-700">{i.code}</span>
                    <span className="min-w-0 flex-1 leading-snug">
                      {i.name}
                      {i.variant && <span className="block text-[13px] text-ink-muted">{i.variant}</span>}
                    </span>
                    <Check aria-hidden="true" className={cn("mt-1 h-4 w-4 shrink-0 text-evergreen-700", i.id === value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
