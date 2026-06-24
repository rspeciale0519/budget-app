import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";
import { WorkspaceSubNav } from "@/components/workspace/workspace-sub-nav";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ws = await getWorkspace(user.id, workspaceId).catch(() => null);
  if (!ws) {
    return (
      <div className="py-16">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            You don&apos;t have access to this workspace.
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabel = ws.type.charAt(0).toUpperCase() + ws.type.slice(1);

  return (
    <div className="space-y-4">
      <div className="my-[22px] flex flex-wrap items-center gap-3">
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-[10px] font-extrabold text-white"
          style={{ background: ws.color }}
        >
          {ws.name.charAt(0).toUpperCase() || "W"}
        </div>
        <div>
          <div className="text-xl font-bold text-ink">{ws.name}</div>
          <div className="text-[12.5px] text-muted">{typeLabel}</div>
        </div>
      </div>
      <WorkspaceSubNav workspaceId={workspaceId} />
      {children}
    </div>
  );
}
