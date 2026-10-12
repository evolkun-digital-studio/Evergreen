"use client";

import { Controller, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharCount, SortableList } from "@/components/admin/inputs";
import { AI_SUMMARY_MAX, AI_SUMMARY_MIN, CONTENT_INTENTS, CONTENT_TYPES, ENTITY_TYPES } from "@/lib/cms/constants";
import type { PostForm } from "./types";

type Entity = { name: string; type: (typeof ENTITY_TYPES)[number]; sameAs: string };
const newEntity = (): Entity => ({ name: "", type: "Thing", sameAs: "" });

function EntityFields({ value, onChange }: { value: Entity; onChange: (e: Entity) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
      <Input aria-label="Entity name" placeholder="e.g. Central Pollution Control Board" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <select aria-label="Entity type" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as Entity["type"] })} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
        {ENTITY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <Input
        aria-label="Wikipedia or Wikidata URL"
        placeholder="https://en.wikipedia.org/wiki/… or https://www.wikidata.org/wiki/Q…"
        value={value.sameAs}
        onChange={(e) => onChange({ ...value, sameAs: e.target.value })}
        className="sm:col-span-2"
      />
    </div>
  );
}

const selectClass = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm text-evergreen-700";

export function AiSeoPanel({ form }: { form: PostForm }) {
  const { control, register } = form;
  const summary = useWatch({ control, name: "ai.aiSummary" }) ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-summary">AI summary (“Quick answer”)</Label>
          <CharCount value={summary} min={AI_SUMMARY_MIN} max={AI_SUMMARY_MAX} hardMax={AI_SUMMARY_MAX} />
        </div>
        <Textarea id="ai-summary" rows={4} maxLength={AI_SUMMARY_MAX} placeholder="A direct, self-contained answer to the main question this post covers." {...register("ai.aiSummary")} />
        <p className="text-xs text-muted-foreground">Shown as a visible box at the top of the article. AI engines quote visible text, so write it as the answer.</p>
      </div>

      <div id="ai-takeaways" className="space-y-1.5">
        <Label>Key takeaways (3–7)</Label>
        <Controller
          control={control}
          name="ai.keyTakeaways"
          render={({ field }) => (
            <SortableList
              items={field.value}
              onChange={field.onChange}
              addLabel="Add takeaway"
              max={7}
              create={() => ""}
              render={(item, update, i) => <Input aria-label={`Takeaway ${i + 1}`} value={item} onChange={(e) => update(e.target.value)} placeholder="One specific, factual point" />}
            />
          )}
        />
      </div>

      <div id="ai-faqs" className="space-y-1.5">
        <Label>FAQ</Label>
        <Controller
          control={control}
          name="ai.faqs"
          render={({ field }) => (
            <SortableList
              items={field.value}
              onChange={field.onChange}
              addLabel="Add question"
              max={30}
              create={() => ({ question: "", answer: "" })}
              render={(item, update, i) => (
                <div className="space-y-2">
                  <Input aria-label={`Question ${i + 1}`} value={item.question} onChange={(e) => update({ ...item, question: e.target.value })} placeholder="Question, as a reader would ask it" />
                  <Textarea aria-label={`Answer ${i + 1}`} rows={3} value={item.answer} onChange={(e) => update({ ...item, answer: e.target.value })} placeholder="Answer in the first sentence, then add detail." />
                </div>
              )}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          Google currently shows FAQ rich results only for well-known government and health sites. The FAQPage markup is still generated because it helps AI engines and other search engines.
        </p>
      </div>

      <fieldset id="ai-entities" className="space-y-4 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-semibold text-evergreen-700">Entity SEO</legend>
        <div className="space-y-1.5">
          <Label>Main entity</Label>
          <Controller
            control={control}
            name="ai.mainEntity"
            render={({ field }) =>
              field.value ? (
                <div className="space-y-2">
                  <EntityFields value={field.value} onChange={field.onChange} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                    Remove main entity
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => field.onChange(newEntity())}>
                  Set main entity
                </Button>
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>About (what the page is about)</Label>
          <Controller
            control={control}
            name="ai.about"
            render={({ field }) => (
              <SortableList items={field.value} onChange={field.onChange} addLabel="Add entity" max={10} create={newEntity} render={(item, update) => <EntityFields value={item} onChange={update} />} />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mentioned entities</Label>
          <Controller
            control={control}
            name="ai.mentions"
            render={({ field }) => (
              <SortableList items={field.value} onChange={field.onChange} addLabel="Add entity" max={20} create={newEntity} render={(item, update) => <EntityFields value={item} onChange={update} />} />
            )}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-evergreen-700">AI context</legend>
        <div className="space-y-1.5">
          <Label htmlFor="ai-country">Target country</Label>
          <Input id="ai-country" maxLength={2} {...register("ai.targetCountry")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-lang">Target language</Label>
          <Input id="ai-lang" {...register("ai.targetLanguage")} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ai-audience">Target audience</Label>
          <Input id="ai-audience" {...register("ai.targetAudience")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-type">Content type</Label>
          <select id="ai-type" className={selectClass} {...register("ai.contentType")}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-intent">Content intent</Label>
          <select id="ai-intent" className={selectClass} {...register("ai.contentIntent")}>
            {CONTENT_INTENTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
    </div>
  );
}
