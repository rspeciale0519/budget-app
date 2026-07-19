import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { formatDate } from "@/lib/format-date";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";
import { listAudit } from "@/services/audit-service";
import { resolveMemberEmails } from "@/services/membership-service";
import { formatAuditLine } from "@/services/audit-format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Activity" };

interface Row {
  id: string;
  action: string;
  entityType: string;
  at: Date;
  userId: string;
  after: unknown;
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  let canView = false;
  let rows: Row[] = [];
  if (user) {
    try {
      const ws = await getWorkspace(user.id, workspaceId);
      if (ws) {
        const list = await listAudit(user.id, ws.organizationId, { workspaceId });
        canView = true;
        rows = list.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          at: r.at,
          userId: r.userId,
          after: r.after,
        }));
      }
    } catch {
      // Not an org admin — the feed is admin-only.
      canView = false;
    }
  }

  const emails = await resolveMemberEmails(rows.map((r) => r.userId));
  const actorFor = (uid: string) => (uid === user?.id ? "You" : (emails[uid] ?? "A teammate"));

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
          {!canView ? (
            <EmptyState
              title="Activity is visible to book admins"
              description="Ask the book owner if you need to see the change history."
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Changes made in this book — new accounts, edits, imports — will be listed here."
            />
          ) : (
            rows.map((e) => (
              <div key={e.id} className="flex justify-between gap-3 border-b border-rule py-1">
                <span className="text-ink/85">
                  {formatAuditLine(actorFor(e.userId), { action: e.action, entityType: e.entityType, after: e.after })}
                </span>
                <span className="shrink-0 text-xs text-dim">{formatDate(e.at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
