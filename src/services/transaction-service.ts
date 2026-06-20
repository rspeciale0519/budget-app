import type { z } from "zod";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { createTransactionSchema, updateTransactionSchema } from "@/lib/zod/entities";
import { applyRules } from "@/services/category-rule-service";
import { dedupeHash } from "@/lib/dedupe";
import { money } from "@/lib/money";
import { calendarDate, fromDbDate, toUtcDate } from "@/lib/calendar-date";
import * as repo from "@/repositories/transaction-repo";

export async function createTransaction(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof createTransactionSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createTransactionSchema.parse(input);
  return rlsClientFor(actorUserId).run(async (tx) => {
    const categoryId =
      data.categoryId ??
      (await applyRules(tx, workspaceId, { description: data.description, merchant: data.merchant })) ??
      undefined;
    const hash = dedupeHash({
      accountId: data.accountId,
      date: data.date,
      amount: data.amount,
      description: data.description,
      runningBalance: null,
    });
    return repo.insertTransaction(tx, {
      workspaceId,
      accountId: data.accountId,
      date: toUtcDate(data.date),
      amount: data.amount.toFixed(2),
      description: data.description,
      merchant: data.merchant,
      categoryId,
      notes: data.notes,
      source: "manual",
      dedupeHash: hash,
      isTransfer: data.isTransfer,
    });
  });
}

export async function updateTransaction(
  actorUserId: string,
  transactionId: string,
  input: z.input<typeof updateTransactionSchema>,
) {
  const existing = await rlsClientFor(actorUserId).run((tx) => repo.findTransaction(tx, transactionId));
  if (!existing) throw new ForbiddenError("Transaction not found or access denied");
  await assertWorkspaceAccess(actorUserId, existing.workspaceId, "admin");
  const data = updateTransactionSchema.parse(input);

  const nextDate = data.date ?? fromDbDate(existing.date);
  const nextAmount = data.amount ?? money(existing.amount.toFixed(2));
  const nextDescription = data.description ?? existing.description;
  const hash = dedupeHash({
    accountId: existing.accountId,
    date: calendarDate(nextDate),
    amount: nextAmount,
    description: nextDescription,
    runningBalance: null,
  });

  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateTransactionRow(tx, transactionId, {
      date: data.date ? toUtcDate(calendarDate(data.date)) : undefined,
      amount: data.amount ? data.amount.toFixed(2) : undefined,
      description: data.description,
      merchant: data.merchant,
      categoryId: data.categoryId,
      notes: data.notes,
      isTransfer: data.isTransfer,
      dedupeHash: hash,
    }),
  );
}

export async function deleteTransaction(actorUserId: string, transactionId: string) {
  const existing = await rlsClientFor(actorUserId).run((tx) => repo.findTransaction(tx, transactionId));
  if (!existing) throw new ForbiddenError("Transaction not found or access denied");
  await assertWorkspaceAccess(actorUserId, existing.workspaceId, "admin");
  return rlsClientFor(actorUserId).run(async (tx) => {
    await repo.reopenBillsPaidBy(tx, transactionId);
    return repo.deleteTransaction(tx, transactionId);
  });
}

/** Flag two transactions as a transfer pair (excluded from income/expense math). */
export async function flagTransfer(actorUserId: string, transactionId: string, pairId: string) {
  const tx0 = await rlsClientFor(actorUserId).run((tx) => repo.findTransaction(tx, transactionId));
  if (!tx0) throw new ForbiddenError("Transaction not found or access denied");
  await assertWorkspaceAccess(actorUserId, tx0.workspaceId, "admin");
  return rlsClientFor(actorUserId).run(async (tx) => {
    await repo.updateTransactionRow(tx, transactionId, { isTransfer: true, transferPairId: pairId });
    await repo.updateTransactionRow(tx, pairId, { isTransfer: true, transferPairId: transactionId });
  });
}

export async function listTransactions(
  actorUserId: string,
  workspaceId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  return rlsClientFor(actorUserId).run((tx) =>
    repo.listByWorkspace(tx, workspaceId, (page - 1) * pageSize, pageSize),
  );
}
