import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { formatDate } from "@/lib/format-date";
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

export const metadata = { title: "Activity" };

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
      <PageHeading>Activity</PageHeading>
      <p className="text-sm text-muted">
        A record of changes in this book (visible to owners and admins).
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {entries.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Changes made in this workspace — new accounts, edits, imports — will be listed here."
            />
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-rule py-1">
                <span className="text-ink/85">
                  {actionLabel(e.action)} · {e.entityType}
                </span>
                <span className="text-xs text-dim">{formatDate(e.at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
