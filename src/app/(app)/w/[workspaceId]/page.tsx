import Link from "next/link";
import { Dashboard } from "@/components/dashboard/dashboard";
import { mockDashboard } from "@/lib/mock/dashboard";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  let name = "Workspace";
  if (user) {
    try {
      const ws = await getWorkspace(user.id, workspaceId);
      if (ws) name = ws.name;
    } catch {
      // Not a member — the dashboard still renders mock data in Phase 1.
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
        <span className="text-xs text-slate-400">Mock data · live wiring lands in Phase 2</span>
      </div>
      <nav className="flex gap-3 text-sm">
        {[
          ["Dashboard", ""],
          ["Manage", "/manage"],
          ["Import", "/import"],
          ["Audit", "/audit"],
        ].map(([label, sub]) => (
          <Link
            key={label}
            href={`/w/${workspaceId}${sub}`}
            className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
          >
            {label}
          </Link>
        ))}
      </nav>
      <Dashboard data={mockDashboard} />
    </div>
  );
}
