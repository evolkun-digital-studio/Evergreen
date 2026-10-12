import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Author, User } from "@/lib/models";
import type { Role } from "@/lib/cms/constants";
import { UsersManager } from "./UsersManager";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Authors write drafts, editors publish, admins manage settings and users." />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <UsersLoader />
      </Suspense>
    </>
  );
}

async function UsersLoader() {
  const me = await requirePageUser("manageUsers");
  await connectDB();
  const [users, authors] = await Promise.all([User.find().sort({ name: 1 }).lean(), Author.find().sort({ name: 1 }).select({ name: 1 }).lean()]);
  return (
    <UsersManager
      currentUserId={me.id}
      authors={authors.map((a) => ({ id: a._id.toString(), name: a.name }))}
      rows={users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role as Role,
        active: u.active,
        authorId: u.authorId?.toString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      }))}
    />
  );
}
