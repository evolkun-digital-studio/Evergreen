import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Author, Post } from "@/lib/models";
import { getMediaMap } from "@/lib/data/media";
import { pickVariantUrl } from "@/lib/media/types";
import { defined } from "@/lib/utils";

export const metadata: Metadata = { title: "Authors" };

export default function AuthorsPage() {
  return (
    <>
      <PageHeader
        title="Authors"
        description="Author and reviewer profiles power the byline, author box and Person schema (E-E-A-T)."
        actions={
          <Button asChild>
            <Link href="/admin/authors/new">
              <Plus className="size-4" /> Add author
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton columns={4} />}>
        <AuthorsLoader />
      </Suspense>
    </>
  );
}

async function AuthorsLoader() {
  await requirePageUser("manageAuthors");
  await connectDB();
  const [authors, counts] = await Promise.all([
    Author.find().sort({ name: 1 }).lean(),
    Post.aggregate<{ _id: unknown; n: number }>([{ $match: { deletedAt: null } }, { $group: { _id: "$authorId", n: { $sum: 1 } } }]),
  ]);
  const count = new Map(counts.map((c) => [String(c._id), c.n]));
  const avatars = await getMediaMap(authors.map((a) => a.avatarId).filter(defined));

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Author</TableHead>
            <TableHead>Job title</TableHead>
            <TableHead>Profile completeness</TableHead>
            <TableHead className="text-right">Posts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {authors.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                No authors yet.
              </TableCell>
            </TableRow>
          )}
          {authors.map((a) => {
            const avatar = a.avatarId ? avatars.get(a.avatarId.toString()) : undefined;
            const missing = [!a.bio && "bio", !a.avatarId && "photo", !a.jobTitle && "job title", !a.expertise?.length && "expertise", !a.sameAs?.length && "profiles"].filter(Boolean);
            return (
              <TableRow key={a._id.toString()}>
                <TableCell>
                  <Link href={`/admin/authors/${a._id}`} className="flex items-center gap-3 font-medium text-evergreen-700 hover:underline">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pickVariantUrl(avatar, 320)} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-paper-2">
                        <UserRound className="size-4" />
                      </span>
                    )}
                    {a.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{a.jobTitle || "—"}</TableCell>
                <TableCell className="text-sm">
                  {missing.length ? <span className="text-amber-700">Missing: {missing.join(", ")}</span> : <span className="text-moss-ink">Complete</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{count.get(a._id.toString()) ?? 0}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
