"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import type { JSONContent } from "@tiptap/core";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Eye,
  ExternalLink,
  History,
  Loader2,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaPickerProvider, useMediaPicker } from "@/components/admin/media/MediaPicker";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { CharCount } from "@/components/admin/inputs";
import { extractHeadings } from "@/lib/content/toc";
import { NODES, type PMNode } from "@/lib/content/types";
import { SITE_URL } from "@/lib/cms/constants";
import { slugify } from "@/lib/slug";
import { formatIst } from "@/lib/time";
import type { MediaItem } from "@/lib/media/types";
import type { EditorPost, EditorPostMeta } from "@/lib/posts/editor-types";
import type { PostData, PostInput, SaveIntent } from "@/lib/validation/post";
import { checkSlugAction, previewUrlAction, savePostAction, schemaPreviewAction } from "../actions";
import { PublishPanel } from "./PublishPanel";
import { SeoPanel } from "./SeoPanel";
import { AiSeoPanel } from "./AiSeoPanel";
import { SchemaPanel } from "./SchemaPanel";
import { RevisionsSheet } from "./RevisionsSheet";
import { ScorePanel, StatusIcon } from "./ScorePanel";
import { scorePost, type FixTarget, type ScoreReport } from "@/lib/seo-score";
import { toScoreInput } from "@/lib/seo-score/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { EditorOptions } from "./types";

const AUTOSAVE_MS = 30_000;

export function PostEditor(props: { post: EditorPost; options: EditorOptions }) {
  return (
    <MediaPickerProvider>
      <PostEditorInner {...props} />
    </MediaPickerProvider>
  );
}

function hasNodeType(node: PMNode, type: string): boolean {
  return node.type === type || Boolean(node.content?.some((c) => hasNodeType(c, type)));
}

function PostEditorInner({ post, options }: { post: EditorPost; options: EditorOptions }) {
  const pickMedia = useMediaPicker();
  const [meta, setMeta] = useState<EditorPostMeta>(post.meta);
  const form = useForm<PostInput>({ defaultValues: post.values });
  const { control, register, setValue, getValues, formState } = form;

  // The document lives outside react-hook-form (it changes on every keystroke).
  const contentRef = useRef<JSONContent>(post.values.content as JSONContent);
  const [editorContent, setEditorContent] = useState<JSONContent>(post.values.content as JSONContent);
  const [contentDirty, setContentDirty] = useState(false);
  const [headingsDoc, setHeadingsDoc] = useState<PMNode>(post.values.content as PMNode);

  const [media, setMedia] = useState(() => new Map(options.media.map((m) => [m.id, m])));
  const rememberMedia = useCallback((m: MediaItem) => setMedia((prev) => new Map(prev).set(m.id, m)), []);

  const [tab, setTab] = useState("publish");
  const [scheduleAt, setScheduleAt] = useState(post.meta.scheduledFor ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(post.meta.updatedAt);
  const [saving, startSaving] = useTransition();
  const [savingIntent, setSavingIntent] = useState<SaveIntent | null>(null);
  const [autosaveError, setAutosaveError] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(post.values.slug));
  const [slugCheck, setSlugCheck] = useState<{ slug: string; available: boolean } | null>(null);

  const [title, slug, excerpt, keyTakeaways, faqs] = useWatch({ control, name: ["title", "slug", "excerpt", "ai.keyTakeaways", "ai.faqs"] });
  const dirty = formState.isDirty || contentDirty;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // --- derived editor data -------------------------------------------------------------------
  const [contentVersion, setContentVersion] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setHeadingsDoc(contentRef.current as PMNode), 400);
    return () => clearTimeout(t);
  }, [contentVersion, editorContent]);
  const headings = useMemo(() => extractHeadings(headingsDoc), [headingsDoc]);
  const contentHasVideo = useMemo(() => hasNodeType(headingsDoc, NODES.videoEmbed), [headingsDoc]);

  const editorData = useMemo(
    () => ({ keyTakeaways, faqs, headings, pickMedia, openAiSeoTab: () => setTab("ai") }),
    [keyTakeaways, faqs, headings, pickMedia],
  );

  const onContentChange = useCallback((doc: JSONContent) => {
    contentRef.current = doc;
    setContentDirty(true);
    setContentVersion((v) => v + 1);
  }, []);

  // --- slug: follows the title until edited by hand; never auto-changes once published -------
  useEffect(() => {
    if (slugTouched || meta.publishedSlug) return;
    setValue("slug", slugify(title ?? ""), { shouldDirty: true });
  }, [title, slugTouched, meta.publishedSlug, setValue]);

  useEffect(() => {
    if (!slug) return;
    const t = setTimeout(async () => {
      const res = await checkSlugAction(slug, meta.id);
      if (res.ok) setSlugCheck({ slug, available: res.data.available });
    }, 400);
    return () => clearTimeout(t);
  }, [slug, meta.id]);

  const slugStatus: "idle" | "checking" | "ok" | "taken" = !slug
    ? "idle"
    : slugCheck?.slug !== slug
      ? "checking"
      : slugCheck.available
        ? "ok"
        : "taken";

  // --- saving --------------------------------------------------------------------------------
  // ProseMirror attrs objects have a null prototype, which React's action serializer treats as
  // opaque client references; a JSON round-trip turns the document into plain objects.
  const collect = useCallback(
    (): PostInput => ({ ...getValues(), content: JSON.parse(JSON.stringify(contentRef.current)) as PostInput["content"] }),
    [getValues],
  );

  const save = useCallback(
    (intent: SaveIntent, opts: { silent?: boolean } = {}) =>
      new Promise<boolean>((resolve) => {
        startSaving(async () => {
          setSavingIntent(intent);
          const values = collect();
          const res = await savePostAction(meta.id, values, intent, intent === "schedule" ? scheduleAt : null);
          setSavingIntent(null);
          if (!res.ok) {
            if (opts.silent) setAutosaveError(true);
            else toast.error(res.error);
            for (const [path, message] of Object.entries(res.fieldErrors ?? {})) {
              form.setError(path as keyof PostInput, { message });
            }
            return resolve(false);
          }
          setAutosaveError(false);
          const { meta: next, savedAt: at } = res.data;
          setMeta(next);
          setSavedAt(at);
          form.reset({ ...values, slug: getValues("slug"), significantUpdate: false }, { keepValues: true });
          setValue("significantUpdate", false);
          setContentDirty(false);
          if (!meta.id && next.id) window.history.replaceState(null, "", `/admin/posts/${next.id}`);
          if (!opts.silent) {
            const messages: Partial<Record<SaveIntent, string>> = {
              draft: "Draft saved",
              publish: meta.status === "PUBLISHED" ? "Post updated" : "Post published",
              update: "Post updated",
              schedule: `Scheduled for ${formatIst(next.scheduledFor)}`,
              unpublish: "Moved back to draft",
            };
            toast.success(messages[intent] ?? "Saved");
          }
          resolve(true);
        });
      }),
    [collect, form, getValues, meta.id, meta.status, scheduleAt, setValue],
  );

  const primaryIntent: SaveIntent = meta.status === "PUBLISHED" ? "update" : "draft";

  // --- live score (debounced) ------------------------------------------------------------------
  const watched = useWatch({ control });
  const [report, setReport] = useState<ScoreReport | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const v = { ...getValues(), content: contentRef.current as PostInput["content"] };
      const featured = v.featuredImageId ? media.get(v.featuredImageId) : undefined;
      setReport(
        scorePost(
          toScoreInput(v, {
            author: options.authorProfiles[v.authorId] ?? null,
            featuredImageAlt: featured?.alt,
            featuredImageSize: featured?.sizeBytes || undefined,
            modifiedAt: v.significantUpdate ? new Date().toISOString() : meta.modifiedAt,
            brokenLinks: options.brokenLinks,
          }),
        ),
      );
    }, 500);
    return () => clearTimeout(t);
  }, [watched, contentVersion, editorContent, media, getValues, options.authorProfiles, options.brokenLinks, meta.modifiedAt]);

  // Publishing with failed checklist items asks for confirmation first.
  const [confirmIntent, setConfirmIntent] = useState<SaveIntent | null>(null);
  const failedChecks = report?.checklist.filter((c) => c.status === "fail") ?? [];
  const requestSave = useCallback(
    (intent: SaveIntent) => {
      if ((intent === "publish" || intent === "schedule") && failedChecks.length) setConfirmIntent(intent);
      else void save(intent);
    },
    [failedChecks.length, save],
  );

  const onFix = useCallback((target: FixTarget) => {
    if (target.tab !== "content") setTab(target.tab);
    setTimeout(() => {
      const el = target.field
        ? document.getElementById(target.field)
        : target.tab === "content"
          ? document.querySelector<HTMLElement>(".ProseMirror")
          : null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.matches("input, textarea, [contenteditable=true]") ? el : el.querySelector<HTMLElement>("input, textarea, button");
      focusable?.focus({ preventScroll: true });
    }, 60);
  }, []);

  // Autosave: drafts are saved in place; live/scheduled posts only get an autosave revision.
  useEffect(() => {
    const t = setInterval(() => {
      if (!dirtyRef.current || saving || meta.deletedAt) return;
      if (!getValues("title").trim()) return;
      void save("autosave", { silent: true });
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [save, saving, getValues, meta.deletedAt]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save(primaryIntent);
      } else if (e.key === "Enter" && options.canPublish) {
        e.preventDefault();
        requestSave(meta.status === "PUBLISHED" ? "update" : "publish");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, requestSave, primaryIntent, options.canPublish, meta.status]);

  // Unsaved-changes guard: tab close/reload, and in-app link clicks.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.href.startsWith(window.location.href.split("#")[0] + "#")) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const preview = async () => {
    if (!meta.id || dirty) {
      const ok = await save(meta.status === "PUBLISHED" ? "autosave" : "draft", { silent: meta.status === "PUBLISHED" });
      if (!ok) return;
    }
    const id = meta.id ?? window.location.pathname.split("/").pop();
    const res = await previewUrlAction(id!);
    if (res.ok) window.open(res.data, "_blank", "noopener");
    else toast.error(res.error);
  };

  const restore = (snapshot: PostData) => {
    const values = { ...snapshot, significantUpdate: false } as PostInput;
    for (const [k, v] of Object.entries(values)) {
      if (k !== "content") setValue(k as keyof PostInput, v as never, { shouldDirty: true });
    }
    contentRef.current = snapshot.content as JSONContent;
    setEditorContent(snapshot.content as JSONContent);
    setContentDirty(true);
  };

  const publicUrl = `${SITE_URL}/blog/${slug || "…"}`;
  const busy = (i: SaveIntent) => saving && savingIntent === i;

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
      {/* Sticky action bar */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur md:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/posts">
            <ArrowLeft className="size-4" /> Posts
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {saving && savingIntent === "autosave" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Autosaving…
            </span>
          ) : autosaveError ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <CircleAlert className="size-3" /> Autosave failed
            </span>
          ) : dirty ? (
            "Unsaved changes"
          ) : savedAt ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-moss-ink" /> Saved {formatIst(savedAt)}
            </span>
          ) : null}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {meta.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRevisionsOpen(true)}>
              <History className="size-4" /> Revisions
            </Button>
          )}
          {meta.status === "PUBLISHED" ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/blog/${meta.publishedSlug}`} target="_blank" rel="noopener">
                <ExternalLink className="size-4" /> View
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={preview} disabled={saving || !title?.trim()}>
            <Eye className="size-4" /> Preview
          </Button>
          {meta.status !== "PUBLISHED" && (
            <Button type="button" variant="outline" size="sm" onClick={() => save("draft")} disabled={saving || !title?.trim()}>
              {busy("draft") ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
            </Button>
          )}
          {options.canPublish && (meta.status === "PUBLISHED" || meta.status === "SCHEDULED") && (
            <Button type="button" variant="outline" size="sm" onClick={() => save("unpublish")} disabled={saving}>
              <Undo2 className="size-4" /> {meta.status === "SCHEDULED" ? "Unschedule" : "Revert to draft"}
            </Button>
          )}
          {options.canPublish && meta.status !== "PUBLISHED" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || !scheduleAt || !title?.trim()}
              onClick={() => requestSave("schedule")}
              title={scheduleAt ? `Schedule for ${formatIst(scheduleAt)}` : "Pick a date in the Publish tab"}
            >
              {busy("schedule") ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} Schedule
            </Button>
          )}
          {options.canPublish && (
            <Button
              type="button"
              size="sm"
              disabled={saving || !title?.trim() || slugStatus === "taken"}
              onClick={() => requestSave(meta.status === "PUBLISHED" ? "update" : "publish")}
            >
              {busy("publish") || busy("update") ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {meta.status === "PUBLISHED" ? "Update" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {meta.deletedAt && (
        <p className="border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive">This post is in the trash. Restore it from the Posts list to edit it.</p>
      )}

      <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Left: content */}
        <div className="min-w-0 space-y-4">
          <div>
            <Label htmlFor="post-title" className="sr-only">
              Title (H1)
            </Label>
            <Textarea
              id="post-title"
              rows={1}
              placeholder="Post title"
              {...register("title")}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="min-h-0 resize-none border-0 bg-transparent px-0 font-display text-3xl font-semibold text-evergreen-700 shadow-none focus-visible:ring-0 md:text-4xl"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">This is the page&apos;s only H1.</span>
              <CharCount value={title ?? ""} max={70} />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="post-slug" className="shrink-0">
                URL
              </Label>
              <span className="text-sm text-muted-foreground">{SITE_URL.replace(/^https?:\/\//, "")}/blog/</span>
              <Input
                id="post-slug"
                {...register("slug", {
                  onChange: (e) => {
                    setSlugTouched(true);
                    setValue("slug", slugify(e.target.value, { maxLength: 120 }).slice(0, 120) + (e.target.value.endsWith("-") ? "-" : ""), { shouldDirty: true });
                  },
                  onBlur: () => setValue("slug", slugify(getValues("slug"))),
                })}
                className="h-8 min-w-[12rem] flex-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setValue("slug", slugify(title ?? "", { removeStopWords: true }), { shouldDirty: true })}>
                Remove stop words
              </Button>
            </div>
            <p className="mt-1.5 text-xs">
              {slugStatus === "taken" ? (
                <span className="text-destructive">This URL is already used by another post.</span>
              ) : slugStatus === "checking" ? (
                <span className="text-muted-foreground">Checking…</span>
              ) : (
                <span className="text-muted-foreground">{publicUrl}</span>
              )}
              {meta.publishedSlug && slug && slug !== meta.publishedSlug && (
                <span className="block text-amber-700">The URL changes on update; a 301 redirect from /blog/{meta.publishedSlug} is created automatically.</span>
              )}
            </p>
            {formState.errors.slug && <p className="text-xs text-destructive">{formState.errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-excerpt">Excerpt</Label>
              <CharCount value={excerpt ?? ""} max={200} />
            </div>
            <Textarea id="post-excerpt" rows={2} placeholder="One or two sentences shown in listings and feeds." {...register("excerpt")} />
          </div>

          <RichTextEditor initialContent={editorContent} data={editorData} onChange={onContentChange} />
        </div>

        {/* Right: tabbed settings */}
        <aside className="min-w-0">
          <Tabs value={tab} onValueChange={setTab} className="xl:sticky xl:top-[7.5rem]">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="publish">Publish</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="ai">AI SEO</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="score" className="gap-1">
                Score
                {report && (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-semibold text-white"
                    style={{ background: report.seo.score >= 80 ? "#4E6B12" : report.seo.score >= 60 ? "#b45309" : "#c43a4a" }}
                  >
                    {report.seo.score}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="mt-3 rounded-xl border border-line bg-white p-4 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto">
              <TabsContent value="publish" forceMount hidden={tab !== "publish"}>
                <PublishPanel form={form} options={options} meta={meta} media={media} rememberMedia={rememberMedia} scheduleAt={scheduleAt} onScheduleAt={setScheduleAt} />
              </TabsContent>
              <TabsContent value="seo" forceMount hidden={tab !== "seo"}>
                <SeoPanel form={form} media={media} rememberMedia={rememberMedia} siteName={options.siteName} defaultOgImageUrl={options.defaultOgImageUrl} />
              </TabsContent>
              <TabsContent value="ai" forceMount hidden={tab !== "ai"}>
                <AiSeoPanel form={form} />
              </TabsContent>
              <TabsContent value="schema" forceMount hidden={tab !== "schema"}>
                <SchemaPanel form={form} media={media} rememberMedia={rememberMedia} contentHasVideo={contentHasVideo} previewSchema={() => schemaPreviewAction(meta.id, collect())} />
              </TabsContent>
              <TabsContent value="score" forceMount hidden={tab !== "score"}>
                <ScorePanel report={report} onFix={onFix} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>

      {meta.id && <RevisionsSheet postId={meta.id} open={revisionsOpen} onOpenChange={setRevisionsOpen} current={collect} onRestore={restore} />}

      <AlertDialog open={confirmIntent !== null} onOpenChange={(o) => !o && setConfirmIntent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {failedChecks.length} checklist item{failedChecks.length === 1 ? "" : "s"} not done
            </AlertDialogTitle>
            <AlertDialogDescription>You can fix them first or {confirmIntent === "schedule" ? "schedule" : "publish"} anyway.</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
            {failedChecks.map((c) => (
              <li key={c.id} className="flex gap-2">
                <StatusIcon status={c.status} />
                <span>
                  <span className="font-medium text-evergreen-700">{c.label}</span> <span className="text-muted-foreground">{c.message}</span>
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setTab("score");
                setConfirmIntent(null);
              }}
            >
              Review checklist
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const intent = confirmIntent;
                setConfirmIntent(null);
                if (intent) void save(intent);
              }}
            >
              {confirmIntent === "schedule" ? "Schedule anyway" : "Publish anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
