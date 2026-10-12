import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { listAdminPosts, loadPostFilterOptions, type PostListParams } from "@/lib/data/admin-posts";
import { can } from "@/lib/cms/constants";
import { PostsTable } from "./PostsTable";

export const metadata: Metadata = { title: "Posts" };

export default function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  return (
    <>
      <PageHeader
        title="Posts"
        description="Write, schedule and publish articles."
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <Plus className="size-4" /> Add new
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton columns={7} />}>
        <PostsLoader searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PostsLoader({ searchParams }: { searchParams: PageProps<"/admin/posts">["searchParams"] }) {
  const user = await requirePageUser();
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as PostListParams;
  const [data, filters] = await Promise.all([listAdminPosts(user, params), loadPostFilterOptions()]);
  return <PostsTable {...data} filters={filters} canPublish={can.publish(user.role)} />;
}
