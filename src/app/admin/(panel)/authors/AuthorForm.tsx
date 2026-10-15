"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChipsInput } from "@/components/admin/inputs";
import { MediaPickerProvider } from "@/components/admin/media/MediaPicker";
import { MediaField } from "../posts/_editor/MediaField";
import { slugify } from "@/lib/slug";
import { SITE_URL } from "@/lib/cms/constants";
import type { MediaItem } from "@/lib/media/types";
import type { AuthorInput } from "@/lib/validation/taxonomy";
import { deleteAuthorAction, saveAuthorAction } from "./actions";
import { useConfirm } from "@/components/admin/ConfirmProvider";

type FormValues = Omit<AuthorInput, "sameAs"> & { sameAs: string };

export function AuthorForm(props: { id: string | null; initial: AuthorInput; media: MediaItem[] }) {
  return (
    <MediaPickerProvider>
      <AuthorFormInner {...props} />
    </MediaPickerProvider>
  );
}

function AuthorFormInner({ id, initial, media: initialMedia }: { id: string | null; initial: AuthorInput; media: MediaItem[] }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [media, setMedia] = useState(() => new Map(initialMedia.map((m) => [m.id, m])));
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const form = useForm<FormValues>({ defaultValues: { ...initial, sameAs: initial.sameAs.join("\n") } });
  const { register, control, setValue, formState } = form;
  const [slugValue, avatarId] = useWatch({ control, name: ["slug", "avatarId"] });

  const submit = (v: FormValues) =>
    startTransition(async () => {
      const res = await saveAuthorAction(id, {
        ...v,
        sameAs: v.sameAs
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (!res.ok) {
        toast.error(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) form.setError(k.split(".")[0] as keyof FormValues, { message: m });
        return;
      }
      toast.success(res.message ?? "Saved");
      form.reset(v);
      if (!id) router.replace(`/admin/authors/${res.data}`);
      else router.refresh();
    });

  const del = async () => {
    if (!id || !(await confirm("Delete this author profile?"))) return;
    startTransition(async () => {
      const res = await deleteAuthorAction(id);
      if (res.ok) {
        toast.success(res.message ?? "Deleted");
        router.push("/admin/authors");
      } else toast.error(res.error);
    });
  };

  const field = (name: keyof FormValues) => formState.errors[name]?.message && <p className="text-xs text-destructive">{String(formState.errors[name]?.message)}</p>;

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5 rounded-xl border border-line bg-white p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-name">Name</Label>
            <Input id="a-name" {...register("name", { onChange: (e) => !slugTouched && setValue("slug", slugify(e.target.value)) })} />
            {field("name")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-slug">Slug</Label>
            <Input id="a-slug" {...register("slug", { onChange: () => setSlugTouched(true), setValueAs: (v: string) => slugify(v) })} />
            <p className="text-xs text-muted-foreground">
              {SITE_URL}/blog/author/{slugValue || "…"}
            </p>
            {field("slug")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-job">Job title</Label>
            <Input id="a-job" placeholder="e.g. EPR Compliance Consultant" {...register("jobTitle")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-cred">Credentials</Label>
            <Input id="a-cred" placeholder="e.g. M.Tech Environmental Engg., 10 years in CPCB compliance" {...register("credentials")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-bio">Bio</Label>
          <Textarea id="a-bio" rows={5} placeholder="First-hand experience and qualifications. Shown in the author box on every article (E-E-A-T)." {...register("bio")} />
        </div>
        <div className="space-y-1.5">
          <Label>Areas of expertise (knowsAbout)</Label>
          <Controller
            control={control}
            name="expertise"
            render={({ field: f }) => (
              <ChipsInput label="Expertise" value={f.value.map((name) => ({ name }))} onChange={(c) => f.onChange(c.map((x) => x.name))} placeholder="e.g. Plastic Waste Management Rules" />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-same">Profiles (sameAs)</Label>
          <Textarea id="a-same" rows={4} placeholder={"https://www.linkedin.com/in/…\nhttps://x.com/…\nhttps://example.com"} {...register("sameAs")} />
          <p className="text-xs text-muted-foreground">One URL per line. Links the author to their verified profiles.</p>
          {field("sameAs")}
        </div>
      </section>
      <aside className="space-y-4">
        <section className="space-y-2 rounded-xl border border-line bg-white p-5">
          <Label>Avatar</Label>
          <MediaField
            label="Avatar"
            value={avatarId}
            media={media}
            hint="Square photo, at least 400×400."
            onChange={(m) => {
              if (m) setMedia((prev) => new Map(prev).set(m.id, m));
              setValue("avatarId", m?.id ?? null, { shouldDirty: true });
            }}
          />
        </section>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save author
        </Button>
        {id && (
          <Button type="button" variant="outline" className="w-full text-destructive" disabled={pending} onClick={del}>
            <Trash2 className="size-4" /> Delete author
          </Button>
        )}
      </aside>
    </form>
  );
}
