import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { newEditorPost } from "@/lib/posts/service";
import { loadEditorOptions } from "@/lib/data/editor-options";
import { PostEditor } from "../_editor/PostEditor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <Suspense fallback={<FormSkeleton sections={2} />}>
      <NewPostLoader />
    </Suspense>
  );
}

async function NewPostLoader() {
  const user = await requirePageUser();
  const post = await newEditorPost(user);
  const options = await loadEditorOptions(user, post);
  return <PostEditor post={post} options={options} />;
}
