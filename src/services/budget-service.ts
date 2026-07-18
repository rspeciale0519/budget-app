import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, add, sub, compare, format, isNegative, type Money } from "@/lib/money";
import * as repo from "@/repositories/budget-repo";

export interface SavedBudget {
  id: string;
  categoryId: string;
  period: string;
  amount: Money;
}

export async function setBudget(
  userId: string,
  workspaceId: string,
  categoryId: string,
  amount: string,
  period = "monthly",
): Promise<SavedBudget> {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  const parsed = money(amount);
  if (isNegative(parsed)) throw new Error("Budget amount must be at least 0");
  const row = await rlsClientFor(userId).run((tx) =>
    repo.upsertAmount(tx, { workspaceId, categoryId, period, amount: parsed.toFixed(2) }),
  );
  return { id: row.id, categoryId: row.categoryId, period: row.period, amount: money(row.amount.toFixed(2)) };
}

export async function listBudgets(userId: string, workspaceId: string): Promise<SavedBudget[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const rows = await rlsClientFor(userId).run((tx) => repo.listByWorkspace(tx, workspaceId));
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    period: r.period,
    amount: money(r.amount.toFixed(2)),
  }));
}

export async function deleteBudget(userId: string, workspaceId: string, budgetId: string): Promise<void> {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  await rlsClientFor(userId).run((tx) => repo.deleteById(tx, budgetId));
}

/** Envelope move: shrink one category's monthly budget and grow another's, atomically. */
export async function moveBudget(
  userId: string,
  workspaceId: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: string,
): Promise<void> {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  if (fromCategoryId === toCategoryId) throw new Error("Pick two different categories");
  const moved = money(amount);
  if (compare(moved, money(0)) <= 0) throw new Error("Enter a positive amount to move");

  await rlsClientFor(userId).run(async (tx) => {
    const rows = await repo.listByWorkspace(tx, workspaceId);
    const from = rows.find((r) => r.categoryId === fromCategoryId);
    const to = rows.find((r) => r.categoryId === toCategoryId);
    if (!from || !to) throw new Error("No budget set for that category yet");
    const fromAmount = money(from.amount.toFixed(2));
    if (compare(moved, fromAmount) > 0) {
      throw new Error(`You can only move up to ${format(fromAmount)}`);
    }
    const toAmount = money(to.amount.toFixed(2));
    await repo.upsertAmount(tx, {
      workspaceId,
      categoryId: fromCategoryId,
      period: from.period,
      amount: sub(fromAmount, moved).toFixed(2),
    });
    await repo.upsertAmount(tx, {
      workspaceId,
      categoryId: toCategoryId,
      period: to.period,
      amount: add(toAmount, moved).toFixed(2),
    });
  });
}
