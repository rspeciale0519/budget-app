import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccessibleWorkspaces } from "@/services/authz";
import { TabBar } from "@/components/workspace/tab-bar";
import { CommandPalette } from "@/components/command/command-palette";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspaces = await listAccessibleWorkspaces(user.id);
  return (
    <div className="min-h-screen">
      <TabBar userId={user.id} />
      <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-5 sm:px-6">{children}</main>
      <CommandPalette workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />
    </div>
  );
}
