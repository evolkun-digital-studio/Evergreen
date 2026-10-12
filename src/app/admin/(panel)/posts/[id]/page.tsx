import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Post } from "@/lib/models";
import { assertCanEdit, toEditorPost } from "@/lib/posts/service";
import { loadEditorOptions } from "@/lib/data/editor-options";
import { can } from "@/lib/cms/constants";
import { PostEditor } from "../_editor/PostEditor";

export const metadata: Metadata = { title: "Edit post" };

export default function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton sections={2} />}>
      <EditPostLoader params={params} />
    </Suspense>
  );
}

async function EditPostLoader({ params }: { params: PageProps<"/admin/posts/[id]">["params"] }) {
  const { id } = await params;
  const user = await requirePageUser();
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const doc = await Post.findById(id).lean();
  if (!doc) notFound();
  if (!can.editAnyPost(user.role)) {
    try {
      assertCanEdit(user, doc);
    } catch (error) {
      return <p className="rounded-md border border-line bg-white p-6 text-sm text-evergreen-700">{(error as Error).message}</p>;
    }
  }
  const post = await toEditorPost(doc);
  const options = await loadEditorOptions(user, post);
  return <PostEditor key={doc._id.toString()} post={post} options={options} />;
}
