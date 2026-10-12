"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanLinksAction } from "../actions";

export function ScanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await scanLinksAction();
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message ?? "Scan started");
          // Results are written in the background; refresh once they have had time to land.
          setTimeout(() => router.refresh(), 20_000);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />} Scan now
    </Button>
  );
}
