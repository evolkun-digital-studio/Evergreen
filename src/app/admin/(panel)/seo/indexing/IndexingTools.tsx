"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestIndexingAction, retryIndexingEntryAction } from "../actions";

export function RequestIndexingForm({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(`${siteUrl}/blog/`);
  const [action, setAction] = useState<"URL_UPDATED" | "URL_DELETED">("URL_UPDATED");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await requestIndexingAction(url, action);
          if (res.ok) toast.success(res.message ?? "Submitted");
          else toast.error(res.error);
          router.refresh();
        });
      }}
    >
      <Input aria-label="URL to submit" value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-[20rem] flex-1 bg-white" />
      <select aria-label="Notification type" value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="h-9 rounded-md border border-input bg-white px-2 text-sm">
        <option value="URL_UPDATED">Updated</option>
        <option value="URL_DELETED">Deleted</option>
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Request indexing
      </Button>
    </form>
  );
}

export function RetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await retryIndexingEntryAction(id);
          if (res.ok) toast.success(res.message ?? "Resubmitted");
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />} Retry
    </Button>
  );
}
