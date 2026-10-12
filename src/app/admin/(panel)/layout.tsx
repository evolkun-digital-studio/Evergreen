import { Suspense } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";

// Admin convention (Cache Components): nothing here or in admin pages awaits the session or
// MongoDB at the top level, and admin data is never `use cache`d. Each component that reads
// them is async and rendered inside its own <Suspense> with a skeleton, so the shell is
// prerendered and the live data streams in. The proxy already bounces signed-out visitors.

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

async function SidebarWithUser() {
  const user = await requirePageUser();
  return <AdminSidebar user={{ name: user.name, email: user.email, role: user.role }} signOutAction={signOutAction} />;
}

async function UserBadge() {
  const user = await requirePageUser();
  return (
    <span className="text-sm text-muted-foreground">
      Signed in as <strong className="font-medium text-evergreen-700">{user.name}</strong> · {user.role.toLowerCase()}
    </span>
  );
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithUser />
      </Suspense>
      <SidebarInset className="min-w-0 bg-paper">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur">
          <SidebarTrigger className="text-evergreen-700" />
          <Suspense fallback={<span className="h-4 w-48 animate-pulse rounded bg-evergreen-700/[0.08]" />}>
            <UserBadge />
          </Suspense>
        </header>
        <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
