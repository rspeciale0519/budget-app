import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { money, sum, toCents, type Money } from "@/lib/money";
import * as repo from "@/repositories/planning-repo";

export interface DebtView {
  name: string;
  balance: Money;
  apr: string;
  minimum: Money;
}

export interface GoalView {
  name: string;
  target: Money;
  saved: Money;
  pct: number;
}

export async function listDebts(
  userId: string,
  workspaceId: string,
): Promise<{ items: DebtView[]; total: Money }> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const debts = await rlsClientFor(userId).run((tx) => repo.listDebtsByWorkspace(tx, workspaceId));
  const items = debts.map((d) => ({
    name: d.name,
    balance: money(d.currentBalance.toFixed(2)),
    apr: `${d.apr.toFixed(2)}%`,
    minimum: money(d.minimumPayment.toFixed(2)),
  }));
  return { items, total: sum(items.map((d) => d.balance)) };
}

export async function listGoals(userId: string, workspaceId: string): Promise<GoalView[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  const goals = await rlsClientFor(userId).run((tx) => repo.listGoalsByWorkspace(tx, workspaceId));
  return goals.map((g) => {
    const target = money(g.targetAmount.toFixed(2));
    const saved = money(g.currentSaved.toFixed(2));
    const targetCents = toCents(target);
    const pct = targetCents === 0n ? 0 : Math.min(100, Math.round((Number(toCents(saved)) / Number(targetCents)) * 100));
    return { name: g.name, target, saved, pct };
  });
}
