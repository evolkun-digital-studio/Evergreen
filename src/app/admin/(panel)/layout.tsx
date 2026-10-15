import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ConfirmProvider } from "@/components/admin/ConfirmProvider";

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

async function TopBarWithUser() {
  const user = await requirePageUser();
  return <AdminTopBar user={{ name: user.name, email: user.email, role: user.role }} signOutAction={signOutAction} />;
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider><SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithUser />
      </Suspense>
      <SidebarInset className="min-w-0 bg-paper">
        <Suspense fallback={<div className="h-16 border-b border-line bg-white" />}><TopBarWithUser /></Suspense>
        <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider></ConfirmProvider>
  );
}
