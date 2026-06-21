import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, add, toCents, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange, type Period } from "@/services/dashboard/period";

export interface PaidVsUnpaid {
  paid: Money;
  unpaid: Money;
  paidPct: number;
}

export async function paidVsUnpaid(
  userId: string,
  workspaceId: string,
  period: Period,
  today: CalendarDate,
): Promise<PaidVsUnpaid> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const { start, end } = periodRange(period, today);
  const dueIn = { gte: toUtcDate(start), lt: toUtcDate(end) };

  return rlsClientFor(userId).run(async (tx) => {
    const paidAgg = await tx.bill.aggregate({
      where: { workspaceId, status: "paid", dueDate: dueIn },
      _sum: { amount: true },
    });
    const unpaidAgg = await tx.bill.aggregate({
      where: { workspaceId, status: { in: ["unpaid", "scheduled", "overdue"] }, dueDate: dueIn },
      _sum: { amount: true },
    });
    const paid = money(paidAgg._sum.amount?.toFixed(2) ?? "0");
    const unpaid = money(unpaidAgg._sum.amount?.toFixed(2) ?? "0");
    const totalCents = toCents(add(paid, unpaid));
    const paidPct = totalCents === 0n ? 0 : Math.round((Number(toCents(paid)) / Number(totalCents)) * 100);
    return { paid, unpaid, paidPct };
  });
}
