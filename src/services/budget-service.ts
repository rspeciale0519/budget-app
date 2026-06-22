import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, isNegative, type Money } from "@/lib/money";
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
