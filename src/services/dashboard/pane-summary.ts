import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { getWorkspace } from "@/services/workspace-service";
import { workspaceMetrics } from "@/services/dashboard/metrics";
import { safeToSpend } from "@/services/dashboard/safe-to-spend";
import { upcomingAndOverdue } from "@/services/bill-service";
import { money, format } from "@/lib/money";
import { fromDbDate, type CalendarDate } from "@/lib/calendar-date";
import { billDisplayStatus, type BillDisplayStatus } from "@/services/bills/bill-status";

export interface PaneSummary {
  workspaceId: string;
  name: string;
  color: string;
  balance: string;
  safeToSpend: string;
  topBills: { vendor: string; amount: string; status: BillDisplayStatus; statusLabel: string }[];
}

export async function paneSummary(
  userId: string,
  workspaceId: string,
  today: CalendarDate,
): Promise<PaneSummary> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const ws = await getWorkspace(userId, workspaceId);
  if (!ws) throw new ForbiddenError("Book not found or access denied");

  const metrics = await workspaceMetrics(userId, workspaceId, "month", today);
  const sts = await safeToSpend(userId, workspaceId, today);
  const buckets = await upcomingAndOverdue(userId, workspaceId, today);

  const topBills = [...buckets.overdue, ...buckets.next7].slice(0, 3).map((b) => {
    const display = billDisplayStatus(b.status, fromDbDate(b.dueDate), today);
    return {
      vendor: b.vendor,
      amount: format(money(b.amount.toFixed(2))),
      status: display.key,
      statusLabel: display.label,
    };
  });

  return {
    workspaceId,
    name: ws.name,
    color: ws.color,
    balance: format(metrics.totalBalance),
    safeToSpend: format(sts.result),
    topBills,
  };
}

/** Batch: resolve a summary for each workspace id (access-checked per id).
 * Used by both the initial /tiles render and the assign/restore actions. */
export async function paneSummaries(
  userId: string,
  workspaceIds: string[],
  today: CalendarDate,
): Promise<Record<string, PaneSummary>> {
  const entries = await Promise.all(
    workspaceIds.map(async (id) => [id, await paneSummary(userId, id, today)] as const),
  );
  return Object.fromEntries(entries);
}
