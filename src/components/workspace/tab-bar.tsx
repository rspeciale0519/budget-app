import Link from "next/link";
import { listAccessibleWorkspaces } from "@/services/authz";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs";

export async function TabBar({ userId }: { userId: string }) {
  const workspaces = await listAccessibleWorkspaces(userId);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-5">
        <div className="flex items-center gap-2 whitespace-nowrap text-[15px] font-bold">
          <span className="h-[18px] w-[18px] rounded-md bg-gradient-to-br from-[#2563eb] to-[#16a34a]" />
          Ledger
        </div>
        <WorkspaceTabs
          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color, icon: w.icon }))}
        />
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/tiles"
            className="flex items-center justify-center rounded-[9px] border border-line bg-white px-2.5 py-[7px] text-sm font-semibold text-[#374151] transition-colors hover:bg-slate-50 lg:hidden"
            title="Tile view"
            aria-label="Tile view"
          >
            ⊞
          </Link>
          <Link
            href="/tiles"
            className="hidden items-center gap-1.5 rounded-[9px] border border-line bg-white px-[11px] py-[7px] text-xs font-semibold text-[#374151] transition-colors hover:bg-slate-50 lg:flex"
            title="Tile multiple workspaces side-by-side"
          >
            ⊞ Tile view
          </Link>
          <Link
            href="/tiles"
            className="hidden items-center gap-1.5 rounded-[9px] border border-line bg-white px-[11px] py-[7px] text-xs font-semibold text-[#374151] transition-colors hover:bg-slate-50 lg:flex"
            title="Saved layouts"
          >
            ⌄ Layouts
          </Link>
          <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#dbeafe] text-xs font-bold text-[#1d4ed8]">
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
}
