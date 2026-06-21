import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, add, mul, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange, type Period } from "@/services/dashboard/period";

export interface WorkspaceMetrics {
  totalBalance: Money;
  moneyIn: Money;
  moneyOut: Money;
}

export async function workspaceMetrics(
  userId: string,
  workspaceId: string,
  period: Period,
  today: CalendarDate,
): Promise<WorkspaceMetrics> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const { start, end } = periodRange(period, today);
  const periodFilter = { gte: toUtcDate(start), lt: toUtcDate(end) };

  return rlsClientFor(userId).run(async (tx) => {
    const accAgg = await tx.account.aggregate({ where: { workspaceId }, _sum: { openingBalance: true } });
    const txAgg = await tx.transaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    const totalBalance = add(
      money(accAgg._sum.openingBalance?.toFixed(2) ?? "0"),
      money(txAgg._sum.amount?.toFixed(2) ?? "0"),
    );

    const inAgg = await tx.transaction.aggregate({
      where: { workspaceId, isTransfer: false, amount: { gt: 0 }, date: periodFilter },
      _sum: { amount: true },
    });
    const outAgg = await tx.transaction.aggregate({
      where: { workspaceId, isTransfer: false, amount: { lt: 0 }, date: periodFilter },
      _sum: { amount: true },
    });

    const moneyIn = money(inAgg._sum.amount?.toFixed(2) ?? "0");
    // Sum of negatives is negative; report the positive magnitude.
    const moneyOut = mul(money(outAgg._sum.amount?.toFixed(2) ?? "0"), "-1");
    return { totalBalance, moneyIn, moneyOut };
  });
}
