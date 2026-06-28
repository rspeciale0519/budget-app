import { listAccessibleWorkspaces } from "@/services/authz";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { TabBarActions } from "@/components/workspace/tab-bar-actions";

export async function TabBar({ userId }: { userId: string }) {
  const workspaces = await listAccessibleWorkspaces(userId);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-5">
        <div className="flex items-center gap-2 whitespace-nowrap text-[15px] font-bold text-ink">
          <span className="h-[18px] w-[18px] rounded-md bg-gradient-to-br from-primary to-teal" />
          Ledger
        </div>
        <WorkspaceTabs
          workspaces={workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            color: w.color,
            icon: w.icon,
          }))}
        />
        <TabBarActions initial={initial} />
      </div>
    </div>
  );
}
