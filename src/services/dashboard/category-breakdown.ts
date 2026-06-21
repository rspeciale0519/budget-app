import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, sub, sum, compare, toCents, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange, type Period } from "@/services/dashboard/period";

export interface CategorySlice {
  categoryId: string;
  name: string;
  amount: Money;
  pct: number;
}

export async function categoryBreakdown(
  userId: string,
  workspaceId: string,
  period: Period,
  today: CalendarDate,
): Promise<CategorySlice[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const { start, end } = periodRange(period, today);

  return rlsClientFor(userId).run(async (tx) => {
    const grouped = await tx.transaction.groupBy({
      by: ["categoryId"],
      where: {
        workspaceId,
        isTransfer: false,
        date: { gte: toUtcDate(start), lt: toUtcDate(end) },
        category: { is: { kind: "expense" } },
      },
      _sum: { amount: true },
    });

    // Expense sums are negative; report positive magnitudes.
    const rows = grouped
      .filter((g): g is typeof g & { categoryId: string } => g.categoryId !== null)
      .map((g) => ({ categoryId: g.categoryId, amount: sub(money(0), money(g._sum.amount?.toFixed(2) ?? "0")) }));

    const total = sum(rows.map((r) => r.amount));
    const totalCents = toCents(total);

    const cats = await tx.category.findMany({
      where: { id: { in: rows.map((r) => r.categoryId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(cats.map((c) => [c.id, c.name]));

    return rows
      .map((r) => ({
        categoryId: r.categoryId,
        name: nameById.get(r.categoryId) ?? "Uncategorized",
        amount: r.amount,
        pct: totalCents === 0n ? 0 : Math.round((Number(toCents(r.amount)) / Number(totalCents)) * 100),
      }))
      .sort((a, b) => compare(b.amount, a.amount));
  });
}
