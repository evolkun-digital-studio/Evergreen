import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCardsSkeleton, TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { LinkCheck, Post } from "@/lib/models";
import { formatIst } from "@/lib/time";
import { ScanButton } from "./ScanButton";

export const metadata: Metadata = { title: "Broken links" };

export default function BrokenLinksPage() {
  return (
    <>
      <PageHeader
        title="Broken links"
        description="Every link and image in published posts is checked daily (HEAD, then GET; 10 s timeout). Fix them in the editor."
        actions={<ScanButton />}
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <StatCardsSkeleton count={4} />
            <TableSkeleton columns={5} />
          </div>
        }
      >
        <BrokenLinksLoader />
      </Suspense>
    </>
  );
}

function describe(code: number | null, error: string) {
  if (code === null) return error || "No response";
  if (code === 404) return "404 Not found";
  if (code === 410) return "410 Gone";
  if (code >= 500) return `${code} Server error`;
  return `${code}`;
}

async function BrokenLinksLoader() {
  await requirePageUser("manageSeoTools");
  await connectDB();
  const [broken, totals, last] = await Promise.all([
    LinkCheck.find({ isBroken: true }).sort({ postId: 1, type: 1 }).lean(),
    LinkCheck.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$type", n: { $sum: 1 } } }]),
    LinkCheck.findOne().sort({ lastCheckedAt: -1 }).select({ lastCheckedAt: 1 }).lean(),
  ]);
  const posts = await Post.find({ _id: { $in: [...new Set(broken.map((b) => b.postId.toString()))] } }).select({ title: 1, slug: 1 }).lean();
  const postById = new Map(posts.map((p) => [p._id.toString(), p]));
  const groups = new Map<string, typeof broken>();
  for (const b of broken) groups.set(b.postId.toString(), [...(groups.get(b.postId.toString()) ?? []), b]);
  const total = totals.reduce((n, t) => n + t.n, 0);

  const cards = [
    { label: "Links & images checked", value: total },
    { label: "Broken", value: broken.length },
    { label: "Posts affected", value: groups.size },
    { label: "Last scan", value: last?.lastCheckedAt ? formatIst(last.lastCheckedAt) : "Never" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-evergreen-700">{c.value}</p>
          </div>
        ))}
      </section>

      {broken.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-line bg-white p-6 text-sm text-moss-ink">
          <CheckCircle2 className="size-5" /> {total ? "No broken links or images found." : "No scan has run yet. Press “Scan now”."}
        </p>
      ) : (
        [...groups].map(([postId, items]) => {
          const post = postById.get(postId);
          return (
            <section key={postId} className="overflow-hidden rounded-xl border border-line bg-white">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3">
                <h2 className="font-medium text-evergreen-700">{post?.title ?? "Deleted post"}</h2>
                {post && (
                  <Link href={`/admin/posts/${postId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-moss-ink hover:underline">
                    <Wrench className="size-4" /> Fix in editor
                  </Link>
                )}
              </header>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead>Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i._id.toString()}>
                      <TableCell className="max-w-[420px] break-all text-xs">
                        <a href={i.url} target="_blank" rel="noopener nofollow" className="text-evergreen-700 underline">
                          {i.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{i.type}</TableCell>
                      <TableCell className="text-sm text-destructive">{describe(i.statusCode ?? null, i.error ?? "")}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{i.lastCheckedAt ? formatIst(i.lastCheckedAt) : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          );
        })
      )}
    </div>
  );
}
