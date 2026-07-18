import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { listBudgets } from "@/services/budget-service";
import { money, sub, format, toCents, compare, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { periodRange } from "@/services/dashboard/period";

export interface BudgetRow {
  budgetId: string;
  categoryId: string;
  name: string;
  budget: string;
  /** Raw budget amount ("200.00") for prefilling the inline editor. */
  budgetRaw: string;
  actual: string;
  /** Formatted magnitude of (actual − budget): "$40.00 over" or "$20.00 left". */
  delta: string;
  pct: number;
  status: "under" | "near" | "over";
}

/** Budget vs. actual for the current month (the Budget table stores monthly
 * amounts). Actual = expense magnitude per category, same query shape as
 * categoryBreakdown. One row per budgeted category, sorted by pct desc. */
export async function budgetVsActual(
  userId: string,
  workspaceId: string,
  today: CalendarDate,
): Promise<BudgetRow[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const budgets = await listBudgets(userId, workspaceId);
  if (budgets.length === 0) return [];
  const { start, end } = periodRange("month", today);

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
    const actualById = new Map<string, Money>();
    for (const g of grouped) {
      if (g.categoryId === null) continue;
      actualById.set(g.categoryId, sub(money(0), money(g._sum.amount?.toFixed(2) ?? "0")));
    }

    const cats = await tx.category.findMany({
      where: { id: { in: budgets.map((b) => b.categoryId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(cats.map((c) => [c.id, c.name]));

    return budgets
      .map((b) => {
        const actual = actualById.get(b.categoryId) ?? money(0);
        const budgetCents = toCents(b.amount);
        const ratio = budgetCents === 0n ? 0 : Number(toCents(actual)) / Number(budgetCents);
        const pct = Math.round(Math.min(ratio, 1.5) * 100);
        const over = compare(actual, b.amount) > 0;
        const status: BudgetRow["status"] = over ? "over" : pct >= 85 ? "near" : "under";
        const diff = over ? sub(actual, b.amount) : sub(b.amount, actual);
        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          name: nameById.get(b.categoryId) ?? "Category",
          budget: format(b.amount),
          budgetRaw: b.amount.toFixed(2),
          actual: format(actual),
          delta: format(diff),
          pct,
          status,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  });
}
