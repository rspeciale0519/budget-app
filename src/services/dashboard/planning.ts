import type { z } from "zod";
import type { RlsTx } from "@/lib/prisma-rls";
import { rlsClientFor } from "@/lib/prisma-rls";
import { prismaAdmin } from "@/lib/prisma-admin";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { audit } from "@/services/audit-service";
import { money, add, sub, sum, compare, toCents, format, type Money } from "@/lib/money";
import { toUtcDate, fromDbDate, today as todayFn, type CalendarDate } from "@/lib/calendar-date";
import { stepByFrequency } from "@/lib/recurrence";
import { nextDebtDueDate } from "@/lib/debt-due";
import { billDisplayStatus, type BillDisplay } from "@/services/bills/bill-status";
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
  /** Next payment chip from the shared bill-status vocabulary. */
  due: BillDisplay;
}

export interface GoalView {
  id: string;
  name: string;
  target: Money;
  saved: Money;
  pct: number;
  targetDate: CalendarDate | null;
  status: string;
  accountId: string | null;
  linked: boolean;
  /** True when 2+ goals share this goal's linked account (DD2). */
  envelope: boolean;
  /** Envelope mode only: the shared account's balance − Σ envelopes (same value
   * for every goal in the group); null otherwise. */
  unallocated: Money | null;
  /** e.g. "auto-adds $200.00 monthly"; null when no schedule. */
  autoAdd: string | null;
}

const zero = () => money(0);
const clampPositive = (m: Money): Money => (compare(m, zero()) < 0 ? zero() : m);

/** Reject linking a goal/debt to an account that isn't in the target workspace
 * (prevents a multi-book user from pointing book A's goal at book B's account).
 * Runs inside the RLS-scoped tx, so an account the user can't see is not-found. */
async function assertAccountInWorkspace(
  tx: RlsTx,
  accountId: string | null | undefined,
  workspaceId: string,
): Promise<void> {
  if (!accountId) return;
  const acct = await tx.account.findFirst({ where: { id: accountId, workspaceId }, select: { id: true } });
  if (!acct) throw new ForbiddenError("Account not in this book");
}

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

// In-process "materialized today" marker, exactly like the recurring-bills one.
const contributionsMaterializedToday = new Map<string, string>();

const AUTO_ADD_LABEL: Record<string, string> = {
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  annual: "yearly",
  custom: "monthly",
};

/**
 * Apply due auto-contributions to UNLINKED goals. A system action mirroring the
 * recurring-bills pattern: runs via the privileged client behind a once-per-day
 * in-process guard, so a viewer-triggered page read never performs RLS writes.
 */
export async function materializeGoalContributions(
  workspaceId: string,
  today: CalendarDate,
): Promise<void> {
  if (contributionsMaterializedToday.get(workspaceId) === today) return;
  contributionsMaterializedToday.set(workspaceId, today);
  const goals = await prismaAdmin.goal.findMany({
    where: { workspaceId, accountId: null, contributionNextDate: { lte: toUtcDate(today) } },
  });
  for (const g of goals) {
    if (!g.contributionAmount || !g.contributionFrequency || !g.contributionNextDate) continue;
    let saved = money(g.currentSaved.toFixed(2));
    const amount = money(g.contributionAmount.toFixed(2));
    let next = fromDbDate(g.contributionNextDate);
    // Anchor the day-of-month to the schedule's own date so a 31st doesn't
    // permanently drift to 28 after passing through February.
    const dayAnchor = Number(next.split("-")[2]);
    for (let guard = 0; compare2(next, today) <= 0 && guard < 2000; guard++) {
      saved = add(saved, amount);
      next = stepByFrequency(next, g.contributionFrequency, 1, dayAnchor);
    }
    const reached = compare(saved, money(g.targetAmount.toFixed(2))) >= 0;
    await prismaAdmin.goal.update({
      where: { id: g.id },
      data: {
        currentSaved: saved.toFixed(2),
        contributionNextDate: toUtcDate(next),
        status: reached ? "reached" : g.status,
      },
    });
  }
}

// calendar-date compare, renamed to avoid clashing with the money compare import.
function compare2(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export async function listGoals(userId: string, workspaceId: string): Promise<GoalView[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");
  await materializeGoalContributions(workspaceId, todayFn());
  return rlsClientFor(userId).run(async (tx) => {
    const goals = await repo.listGoalsByWorkspace(tx, workspaceId);
    const linkedIds = goals.flatMap((g) => (g.accountId ? [g.accountId] : []));
    const balances = await accountBalances(tx, [...new Set(linkedIds)]);

    // DD2: an account shared by 2+ goals switches that group to envelope mode.
    const linkCount = new Map<string, number>();
    for (const id of linkedIds) linkCount.set(id, (linkCount.get(id) ?? 0) + 1);
    const envelopeAccounts = new Set([...linkCount.entries()].filter(([, n]) => n >= 2).map(([id]) => id));
    const unallocatedByAccount = new Map<string, Money>();
    for (const accountId of envelopeAccounts) {
      const balance = balances.get(accountId) ?? zero();
      const allocated = sum(
        goals.filter((g) => g.accountId === accountId).map((g) => money(g.currentSaved.toFixed(2))),
      );
      unallocatedByAccount.set(accountId, clampPositive(sub(balance, allocated)));
    }

    return goals.map((g) => {
      const target = money(g.targetAmount.toFixed(2));
      const linked = g.accountId != null;
      const envelope = linked && envelopeAccounts.has(g.accountId!);
      const saved = clampPositive(
        envelope
          ? money(g.currentSaved.toFixed(2))
          : linked
            ? (balances.get(g.accountId!) ?? zero())
            : money(g.currentSaved.toFixed(2)),
      );
      const autoAdd =
        !linked && g.contributionAmount && g.contributionFrequency
          ? `auto-adds ${format(money(g.contributionAmount.toFixed(2)))} ${AUTO_ADD_LABEL[g.contributionFrequency] ?? g.contributionFrequency}`
          : null;
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
        envelope,
        unallocated: envelope ? (unallocatedByAccount.get(g.accountId!) ?? zero()) : null,
        autoAdd,
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
    const today = todayFn();
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
        due: billDisplayStatus("unpaid", nextDebtDueDate(d.dueDay, today), today),
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

const LINKED_AUTO_ADD_ERROR =
  "Auto-add works on manually-tracked goals — a linked goal already tracks its account.";

/** DD2 transition (1 → 2 goals on one account): seed the previously-single
 * goal's envelope with the account's live balance, so the savings it displayed
 * yesterday is exactly what its envelope holds today. */
async function seedEnvelopeOnShare(tx: RlsTx, accountId: string, excludeGoalId?: string) {
  const existing = await tx.goal.findMany({
    where: { accountId, ...(excludeGoalId ? { id: { not: excludeGoalId } } : {}) },
    select: { id: true },
  });
  if (existing.length !== 1) return; // 0 → first link (live mode); 2+ → already envelopes
  const balances = await accountBalances(tx, [accountId]);
  const bal = clampPositive(balances.get(accountId) ?? zero());
  await repo.updateGoalRow(tx, existing[0]!.id, { currentSaved: bal.toFixed(2) });
}

export async function createGoal(
  userId: string,
  workspaceId: string,
  input: z.input<typeof createGoalSchema>,
) {
  await assertWorkspaceAccess(userId, workspaceId, "admin");
  const data = createGoalSchema.parse(input);
  if (data.accountId && data.contributionAmount) throw new Error(LINKED_AUTO_ADD_ERROR);
  return rlsClientFor(userId).run(async (tx) => {
    await assertAccountInWorkspace(tx, data.accountId, workspaceId);
    if (data.accountId) await seedEnvelopeOnShare(tx, data.accountId);
    const goal = await repo.insertGoal(tx, {
      workspaceId,
      name: data.name,
      targetAmount: data.targetAmount.toFixed(2),
      targetDate: data.targetDate ? toUtcDate(data.targetDate) : null,
      accountId: data.accountId ?? null,
      notes: data.notes ?? null,
      contributionAmount: data.contributionAmount?.toFixed(2),
      contributionFrequency: data.contributionFrequency,
      contributionNextDate: data.contributionNextDate ? toUtcDate(data.contributionNextDate) : undefined,
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
  const effectiveAccountId = data.accountId === undefined ? goal.accountId : data.accountId;
  const addingContributions = data.contributionAmount !== undefined && !data.clearContributions;
  const keepsContributions = goal.contributionAmount != null && !data.clearContributions;
  if (effectiveAccountId && (addingContributions || (data.accountId && keepsContributions))) {
    throw new Error(LINKED_AUTO_ADD_ERROR);
  }
  return rlsClientFor(userId).run(async (tx) => {
    await assertAccountInWorkspace(tx, data.accountId, goal.workspaceId);
    // A NEW link (different account than before) may flip that account 1 → 2.
    if (data.accountId && data.accountId !== goal.accountId) {
      await seedEnvelopeOnShare(tx, data.accountId, goal.id);
    }
    const updated = await repo.updateGoalRow(tx, goal.id, {
      name: data.name,
      targetAmount: data.targetAmount?.toFixed(2),
      targetDate: data.targetDate === undefined ? undefined : data.targetDate ? toUtcDate(data.targetDate) : null,
      accountId: data.accountId,
      currentSaved: data.currentSaved?.toFixed(2),
      status: data.status,
      notes: data.notes,
      ...(data.clearContributions
        ? { contributionAmount: null, contributionFrequency: null, contributionNextDate: null }
        : {
            contributionAmount: data.contributionAmount?.toFixed(2),
            contributionFrequency: data.contributionFrequency,
            contributionNextDate: data.contributionNextDate ? toUtcDate(data.contributionNextDate) : undefined,
          }),
    });
    await audit(tx, { userId, workspaceId: goal.workspaceId, action: "update", entityType: "Goal", entityId: goal.id, after: { name: updated.name } });
    return updated;
  });
}

/** Envelope mode only: move `amount` from the shared account's unallocated pool
 * into this goal's envelope. Validated inside the RLS tx. */
export async function allocateToGoal(userId: string, goalId: string, amountInput: string) {
  const goal = await loadGoalForAdmin(userId, goalId);
  if (!goal.accountId) throw new Error("This goal isn't linked to an account — use Add to savings.");
  const { amount } = contributeGoalSchema.parse({ amount: amountInput });
  if (compare(amount, zero()) <= 0) throw new Error("Enter a positive amount");
  return rlsClientFor(userId).run(async (tx) => {
    const siblings = await tx.goal.findMany({ where: { accountId: goal.accountId } });
    if (siblings.length < 2) {
      throw new Error("This goal tracks the whole account — its balance is already the progress.");
    }
    const balances = await accountBalances(tx, [goal.accountId!]);
    const balance = clampPositive(balances.get(goal.accountId!) ?? zero());
    const allocated = sum(siblings.map((s) => money(s.currentSaved.toFixed(2))));
    const unallocated = clampPositive(sub(balance, allocated));
    if (compare(amount, unallocated) > 0) {
      throw new Error(`Only ${format(unallocated)} is unallocated in this account.`);
    }
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
    await assertAccountInWorkspace(tx, data.accountId, workspaceId);
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
    await assertAccountInWorkspace(tx, data.accountId, debt.workspaceId);
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
