import { rlsClientFor } from "@/lib/prisma-rls";
import { assertOrgRole, listAccessibleWorkspaces } from "@/services/authz";
import { money, sub, sum, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange, type Period } from "@/services/dashboard/period";
import { workspaceMetrics } from "@/services/dashboard/metrics";

export interface RollupRow {
  workspaceId: string;
  name: string;
  balance: Money;
  in: Money;
  out: Money;
  unpaid: Money;
  net: Money;
}

export interface Rollup {
  rows: RollupRow[];
  combined: Omit<RollupRow, "workspaceId" | "name">;
}

export async function rollup(
  userId: string,
  organizationId: string,
  period: Period,
  today: CalendarDate,
): Promise<Rollup> {
  await assertOrgRole(userId, organizationId, "member");
  const workspaces = (await listAccessibleWorkspaces(userId)).filter(
    (w) => w.organizationId === organizationId,
  );

  const rows: RollupRow[] = [];
  for (const ws of workspaces) {
    const metrics = await workspaceMetrics(userId, ws.id, period, today);
    const unpaidAgg = await rlsClientFor(userId).run((tx) =>
      tx.bill.aggregate({
        where: { workspaceId: ws.id, status: { in: ["unpaid", "scheduled", "overdue"] } },
        _sum: { amount: true },
      }),
    );
    const unpaid = money(unpaidAgg._sum.amount?.toFixed(2) ?? "0");
    rows.push({
      workspaceId: ws.id,
      name: ws.name,
      balance: metrics.totalBalance,
      in: metrics.moneyIn,
      out: metrics.moneyOut,
      unpaid,
      net: sub(metrics.moneyIn, metrics.moneyOut),
    });
  }

  // Net out inter-workspace transfers the caller can see: an owner draw shows as
  // income on one side and outflow on the other, so subtract it once from each.
  const { start, end } = periodRange(period, today);
  const transfers = await rlsClientFor(userId).run((tx) =>
    tx.workspaceTransfer.findMany({
      where: { organizationId, date: { gte: toUtcDate(start), lt: toUtcDate(end) } },
    }),
  );
  const transferTotal = sum(transfers.map((t) => money(t.amount.toFixed(2))));

  const combinedIn = sub(sum(rows.map((r) => r.in)), transferTotal);
  const combinedOut = sub(sum(rows.map((r) => r.out)), transferTotal);
  const combined = {
    balance: sum(rows.map((r) => r.balance)),
    in: combinedIn,
    out: combinedOut,
    unpaid: sum(rows.map((r) => r.unpaid)),
    net: sub(combinedIn, combinedOut),
  };

  return { rows, combined };
}
