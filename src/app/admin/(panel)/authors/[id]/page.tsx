import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Author } from "@/lib/models";
import { getMediaMap } from "@/lib/data/media";
import { AuthorForm } from "../AuthorForm";

export const metadata: Metadata = { title: "Author" };

// Handles both /admin/authors/new and /admin/authors/<id>.
export default function AuthorPage({ params }: PageProps<"/admin/authors/[id]">) {
  return (
    <>
      <PageHeader title="Author profile" description="Write the bio in the third person and list real, verifiable credentials." />
      <Suspense fallback={<FormSkeleton sections={2} />}>
        <AuthorLoader params={params} />
      </Suspense>
    </>
  );
}

async function AuthorLoader({ params }: { params: PageProps<"/admin/authors/[id]">["params"] }) {
  const { id } = await params;
  await requirePageUser("manageAuthors");
  if (id === "new") {
    return (
      <AuthorForm
        id={null}
        media={[]}
        initial={{ name: "", slug: "", bio: "", avatarId: null, jobTitle: "", expertise: [], sameAs: [], credentials: "" }}
      />
    );
  }
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const a = await Author.findById(id).lean();
  if (!a) notFound();
  const media = await getMediaMap(a.avatarId ? [a.avatarId] : []);
  return (
    <AuthorForm
      id={a._id.toString()}
      media={[...media.values()]}
      initial={{
        name: a.name,
        slug: a.slug,
        bio: a.bio ?? "",
        avatarId: a.avatarId?.toString() ?? null,
        jobTitle: a.jobTitle ?? "",
        expertise: a.expertise ?? [],
        sameAs: a.sameAs ?? [],
        credentials: a.credentials ?? "",
      }}
    />
  );
}
