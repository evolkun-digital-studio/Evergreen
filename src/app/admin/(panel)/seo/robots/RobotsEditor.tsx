"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { finalizeRobots, validateRobots } from "@/lib/seo/robots";
import { DEFAULT_ROBOTS_TXT } from "@/lib/cms/defaults";
import { saveRobotsAction } from "../actions";

export function RobotsEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const issues = useMemo(() => validateRobots(text), [text]);
  const errors = issues.filter((i) => i.level === "error");

  const save = () =>
    startTransition(async () => {
      const res = await saveRobotsAction(text);
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        setSaved(text);
      } else toast.error(res.error);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <Textarea
          aria-label="robots.txt rules"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          spellCheck={false}
          className="bg-white font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending || errors.length > 0 || text === saved}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </Button>
          <Button variant="outline" onClick={() => setText(DEFAULT_ROBOTS_TXT)}>
            <RotateCcw className="size-4" /> Reset to default
          </Button>
          <Button asChild variant="ghost">
            <a href="/robots.txt" target="_blank" rel="noopener">
              <ExternalLink className="size-4" /> View live file
            </a>
          </Button>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-evergreen-700">Validation</h2>
          {issues.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-moss-ink">
              <CheckCircle2 className="size-4" /> No problems found.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {issues.map((i, k) => (
                <li key={k} className={i.level === "error" ? "flex gap-2 text-destructive" : "flex gap-2 text-amber-700"}>
                  {i.level === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                  <span>
                    {i.line > 0 && <strong>Line {i.line}: </strong>}
                    {i.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-evergreen-700">Served file (preview)</h2>
          <p className="mt-1 text-xs text-muted-foreground">The sitemap line is always added automatically.</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-paper-2 p-3 text-xs text-evergreen-700">{finalizeRobots(text)}</pre>
        </section>
      </aside>
    </div>
  );
}
