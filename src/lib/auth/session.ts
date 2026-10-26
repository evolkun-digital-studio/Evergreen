import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { can, isCmsRole, type Role } from "@/lib/cms/constants";
import { auth } from "./index";
import { PermissionError } from "@/lib/errors";

export { PermissionError };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  authorId: string | null;
};

export type Permission = keyof typeof can;

/**
 * Data access layer entry point. The JWT only proves who signed in; role and active
 * status are re-read from the database so demotions and deactivations apply at once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  await connectDB();
  const user = await User.findById(id).lean();
  if (!user || !user.active) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    authorId: user.authorId ? user.authorId.toString() : null,
  };
});

/** For pages: redirects to login, or to the dashboard when the role lacks `permission`. */
export async function requirePageUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isCmsRole(user.role)) redirect("/documents/library");
  if (permission && !can[permission](user.role)) redirect("/admin?denied=1");
  return user;
}

/** For Server Actions and route handlers: throws instead of redirecting. */
export async function requireActionUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionError("Your session has expired. Please sign in again.");
  // Viewers may only use the document library; every other action needs a CMS role.
  if (!isCmsRole(user.role) && permission !== "viewDocuments") throw new PermissionError();
  if (permission && !can[permission](user.role)) throw new PermissionError();
  return user;
}

/** For the Documents library: sends signed-out visitors to its own login, then back to `next`. */
export async function requireDocumentsUser(next = "/documents/library"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/documents/login?next=${encodeURIComponent(next)}`);
  if (!can.viewDocuments(user.role)) redirect("/documents/login?denied=1");
  return user;
}
