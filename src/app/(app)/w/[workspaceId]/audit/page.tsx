import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";
import { listAudit } from "@/services/audit-service";

const ACTION_LABEL: Record<string, string> = {
  mark_paid: "Marked paid",
  mark_paid_standalone: "Marked paid",
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  import: "Imported",
  income_bridge: "Owner draw recorded",
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  let entries: { id: string; action: string; entityType: string; at: Date }[] = [];
  if (user) {
    try {
      const ws = await getWorkspace(user.id, workspaceId);
      if (ws) {
        const rows = await listAudit(user.id, ws.organizationId, { workspaceId });
        entries = rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entityType, at: r.at }));
      }
    } catch {
      // Not an org admin — audit log stays hidden.
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Audit Log</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity (owner/admin only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {entries.length === 0 ? (
            <p className="text-muted">No entries visible.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-rule py-1">
                <span className="text-ink/85">
                  {actionLabel(e.action)} · {e.entityType}
                </span>
                <span className="text-xs text-dim">{e.at.toISOString().slice(0, 10)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
