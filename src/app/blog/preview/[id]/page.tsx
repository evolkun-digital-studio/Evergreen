import type { Metadata } from "next";
import { Suspense } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Post } from "@/lib/models";
import { verifyPreviewToken } from "@/lib/preview";
import { toPublicPost } from "@/lib/data/blog";
import { ArticleView } from "@/components/blog/ArticleView";
import { FontSafe } from "@/components/FontSafe";

// Draft preview: token-protected, uncached, never indexed (also disallowed in robots.txt and
// sent with X-Robots-Tag by the proxy). Uses the real article template.
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false, nocache: true },
};

export default function PreviewPage(props: PageProps<"/blog/preview/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Preview {...props} />
    </Suspense>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6 text-center text-evergreen-700">
      <div>
        <h1>
          <FontSafe>{title}</FontSafe>
        </h1>
        <p className="mt-2 text-sm">{body}</p>
      </div>
    </div>
  );
}

async function Preview({ params, searchParams }: PageProps<"/blog/preview/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const exp = typeof sp.exp === "string" ? sp.exp : undefined;
  const token = typeof sp.token === "string" ? sp.token : undefined;

  if (!mongoose.isValidObjectId(id) || !verifyPreviewToken(id, exp, token)) {
    return <Notice title="Preview link expired or invalid" body="Open the post in the CMS and click Preview again." />;
  }
  await connectDB();
  const doc = await Post.findById(id).lean();
  if (!doc) return <Notice title="Post not found" body="This post no longer exists." />;
  const post = await toPublicPost(doc);

  return (
    <>
      <p className="sticky top-[var(--header-h)] z-50 bg-evergreen-900 px-4 py-2 text-center text-sm text-white">
        Preview · {doc.status.toLowerCase()} · not visible to the public
      </p>
      <ArticleView post={post} related={[]} adjacent={{ prev: null, next: null }} />
    </>
  );
}
