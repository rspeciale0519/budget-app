import type { z } from "zod";
import type { RlsTx } from "@/lib/prisma-rls";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { audit } from "@/services/audit-service";
import { money, add, sub, sum, compare, toCents, type Money } from "@/lib/money";
import { toUtcDate, fromDbDate } from "@/lib/calendar-date";
import {
  createGoalSchema,
  updateGoalSchema,
  contributeGoalSchema,
  createDebtSchema,
  updateDebtSchema,
  recordDebtPaymentSchema,
} from "@/lib/zod/entities";
import * as repo from "@/repositories/planning-repo";

export interface DebtView {
  id: string;
  name: string;
  balance: Money;
  apr: string; // "19.99%"
  aprValue: Money; // raw percent for payoff math
  minimum: Money;
  dueDay: number;
  accountId: string | null;
  linked: boolean;
}

export interface GoalView {
  id: string;
  name: string;
  target: Money;
  saved: Money;
  pct: number;
  targetDate: string | null;
  status: string;
  accountId: string | null;
  linked: boolean;
}

const zero = () => money(0);
const clampPositive = (m: Money): Money => (compare(m, zero()) < 0 ? zero() : m);

/** Live balance (opening + Σ transactions) for a set of accounts, in one pass. */
async function accountBalances(tx: RlsTx, ids: string[]): Promise<Map<string, Money>> {
  const out = new Map<string, Money>();
  if (ids.length === 0) return out;
  const [accounts, grouped] = await Promise.all([
    tx.account.findMany({ where: { id: { in: ids } }, select: { id: true, openingBalance: true } }),
    tx.transaction.groupBy({ by: ["accountId"], where: { accountId: { in: ids } }, _sum: { amount: true } }),
  ]);
  const txByAccount = new Map(grouped.map((g) => [g.accountId, money(g._sum.amount?.toFixed(2) ?? "0")]));
  for (const a of accounts) {
    out.set(a.id, add(money(a.openingBalance.toFixed(2)), txByAccount.get(a.id) ?? zero()));
  }
  return out;
}

function goalPct(saved: Money, target: Money): number {
  const targetCents = toCents(target);
  if (targetCents === 0n) return 0;
  return Math.min(100, Math.round((Number(toCents(saved)) / Number(targetCents)) * 100));
}

export async function listGoals(userId: string, workspaceId: string): Promise<GoalView[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  return rlsClientFor(userId).run(async (tx) => {
    const goals = await repo.listGoalsByWorkspace(tx, workspaceId);
    const linkedIds = [...new Set(goals.flatMap((g) => (g.accountId ? [g.accountId] : [])))];
    const balances = await accountBalances(tx, linkedIds);
    return goals.map((g) => {
      const target = money(g.targetAmount.toFixed(2));
      const linked = g.accountId != null;
      const saved = clampPositive(
        linked ? (balances.get(g.accountId!) ?? zero()) : money(g.currentSaved.toFixed(2)),
      );
      return {
        id: g.id,
        name: g.name,
        target,
        saved,
        pct: goalPct(saved, target),
        targetDate: g.targetDate ? fromDbDate(g.targetDate) : null,
        status: g.status,
        accountId: g.accountId,
        linked,
      };
    });
  });
}

export async function listDebts(
  userId: string,
  workspaceId: string,
): Promise<{ items: DebtView[]; total: Money }> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  return rlsClientFor(userId).run(async (tx) => {
    const debts = await repo.listDebtsByWorkspace(tx, workspaceId);
    const linkedIds = [...new Set(debts.flatMap((d) => (d.accountId ? [d.accountId] : [])))];
    const balances = await accountBalances(tx, linkedIds);
    const items: DebtView[] = debts.map((d) => {
      const linked = d.accountId != null;
      // A liability account's live balance is negative when money is owed, so
      // owed = −balance (clamped ≥ 0). Unlinked debts use the stored balance.
      const balance = clampPositive(
        linked
          ? sub(zero(), balances.get(d.accountId!) ?? zero())
          : money(d.currentBalance.toFixed(2)),
      );
      return {
        id: d.id,
        name: d.name,
        balance,
        apr: `${d.apr.toFixed(2)}%`,
        aprValue: money(d.apr.toFixed(2)),
        minimum: money(d.minimumPayment.toFixed(2)),
        dueDay: d.dueDay,
        accountId: d.accountId,
        linked,
      };
    });
    return { items, total: sum(items.map((d) => d.balance)) };
  });
}

// ── Writes ───────────────────────────────────────────────────────────────────

async function loadGoalForAdmin(userId: string, goalId: string) {
  const goal = await rlsClientFor(userId).run((tx) => repo.findGoal(tx, goalId));
  if (!goal) throw new ForbiddenError("Goal not found or access denied");
  await assertWorkspaceAccess(userId, goal.workspaceId, "admin");
  return goal;
}

async function loadDebtForAdmin(userId: string, debtId: string) {
  const debt = await rlsClientFor(userId).run((tx) => repo.findDebt(tx, debtId));
  if (!debt) throw new ForbiddenError("Debt not found or access denied");
  await assertWorkspaceAccess(userId, debt.workspaceId, "admin");
  return debt;
}

export async function createGoal(
  userId: string,
  workspaceId: string,
  input: z.input<typeof createGoalSchema>,
) {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  const data = createGoalSchema.parse(input);
  return rlsClientFor(userId).run(async (tx) => {
    const goal = await repo.insertGoal(tx, {
      workspaceId,
      name: data.name,
      targetAmount: data.targetAmount.toFixed(2),
      targetDate: data.targetDate ? toUtcDate(data.targetDate) : null,
      accountId: data.accountId ?? null,
      notes: data.notes ?? null,
    });
    await audit(tx, { userId, workspaceId, action: "create", entityType: "Goal", entityId: goal.id, after: { name: goal.name } });
    return goal;
  });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: z.input<typeof updateGoalSchema>,
) {
  const goal = await loadGoalForAdmin(userId, goalId);
  const data = updateGoalSchema.parse(input);
  return rlsClientFor(userId).run(async (tx) => {
    const updated = await repo.updateGoalRow(tx, goal.id, {
      name: data.name,
      targetAmount: data.targetAmount?.toFixed(2),
      targetDate: data.targetDate === undefined ? undefined : data.targetDate ? toUtcDate(data.targetDate) : null,
      accountId: data.accountId,
      currentSaved: data.currentSaved?.toFixed(2),
      status: data.status,
      notes: data.notes,
    });
    await audit(tx, { userId, workspaceId: goal.workspaceId, action: "update", entityType: "Goal", entityId: goal.id, after: { name: updated.name } });
    return updated;
  });
}

export async function deleteGoal(userId: string, goalId: string) {
  const goal = await loadGoalForAdmin(userId, goalId);
  return rlsClientFor(userId).run(async (tx) => {
    await audit(tx, { userId, workspaceId: goal.workspaceId, action: "delete", entityType: "Goal", entityId: goal.id, after: { name: goal.name } });
    return repo.deleteGoalRow(tx, goal.id);
  });
}

export async function contributeToGoal(userId: string, goalId: string, amountInput: string) {
  const goal = await loadGoalForAdmin(userId, goalId);
  if (goal.accountId) {
    throw new Error("This goal tracks an account — move money into that account instead.");
  }
  const { amount } = contributeGoalSchema.parse({ amount: amountInput });
  if (compare(amount, zero()) <= 0) throw new Error("Enter a positive amount");
  return rlsClientFor(userId).run(async (tx) => {
    const newSaved = add(money(goal.currentSaved.toFixed(2)), amount);
    const reached = compare(newSaved, money(goal.targetAmount.toFixed(2))) >= 0;
    const updated = await repo.updateGoalRow(tx, goal.id, {
      currentSaved: newSaved.toFixed(2),
      status: reached ? "reached" : goal.status,
    });
    await audit(tx, { userId, workspaceId: goal.workspaceId, action: "update", entityType: "Goal", entityId: goal.id, after: { currentSaved: newSaved.toFixed(2) } });
    return { goal: updated, reached };
  });
}

export async function createDebt(
  userId: string,
  workspaceId: string,
  input: z.input<typeof createDebtSchema>,
) {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  const data = createDebtSchema.parse(input);
  return rlsClientFor(userId).run(async (tx) => {
    const debt = await repo.insertDebt(tx, {
      workspaceId,
      name: data.name,
      type: data.type,
      apr: data.apr.toFixed(2),
      minimumPayment: data.minimumPayment.toFixed(2),
      dueDay: data.dueDay,
      accountId: data.accountId ?? null,
      currentBalance: (data.currentBalance ?? zero()).toFixed(2),
    });
    await audit(tx, { userId, workspaceId, action: "create", entityType: "Debt", entityId: debt.id, after: { name: debt.name } });
    return debt;
  });
}

export async function updateDebt(
  userId: string,
  debtId: string,
  input: z.input<typeof updateDebtSchema>,
) {
  const debt = await loadDebtForAdmin(userId, debtId);
  const data = updateDebtSchema.parse(input);
  return rlsClientFor(userId).run(async (tx) => {
    const updated = await repo.updateDebtRow(tx, debt.id, {
      name: data.name,
      type: data.type,
      apr: data.apr?.toFixed(2),
      minimumPayment: data.minimumPayment?.toFixed(2),
      dueDay: data.dueDay,
      accountId: data.accountId,
      currentBalance: data.currentBalance?.toFixed(2),
    });
    await audit(tx, { userId, workspaceId: debt.workspaceId, action: "update", entityType: "Debt", entityId: debt.id, after: { name: updated.name } });
    return updated;
  });
}

export async function deleteDebt(userId: string, debtId: string) {
  const debt = await loadDebtForAdmin(userId, debtId);
  return rlsClientFor(userId).run(async (tx) => {
    await audit(tx, { userId, workspaceId: debt.workspaceId, action: "delete", entityType: "Debt", entityId: debt.id, after: { name: debt.name } });
    return repo.deleteDebtRow(tx, debt.id);
  });
}

export async function recordDebtPayment(userId: string, debtId: string, amountInput: string) {
  const debt = await loadDebtForAdmin(userId, debtId);
  if (debt.accountId) {
    throw new Error("This debt tracks an account — record the payment as a transaction on that account instead.");
  }
  const { amount } = recordDebtPaymentSchema.parse({ amount: amountInput });
  if (compare(amount, zero()) <= 0) throw new Error("Enter a positive amount");
  return rlsClientFor(userId).run(async (tx) => {
    const next = clampPositive(sub(money(debt.currentBalance.toFixed(2)), amount));
    const updated = await repo.updateDebtRow(tx, debt.id, { currentBalance: next.toFixed(2) });
    await audit(tx, { userId, workspaceId: debt.workspaceId, action: "update", entityType: "Debt", entityId: debt.id, after: { currentBalance: next.toFixed(2) } });
    return updated;
  });
}
