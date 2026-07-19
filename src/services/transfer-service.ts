import type { TransferType } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { dedupeHash } from "@/lib/dedupe";
import { money, mul, compare, type Money } from "@/lib/money";
import { calendarDate, fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import * as repo from "@/repositories/transfer-repo";

export interface AccountTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
}

/**
 * Move money between two accounts in the same workspace: a paired pair of
 * transactions (negative out, positive in) flagged `isTransfer` so neither
 * side counts as income or spending.
 */
export async function createAccountTransfer(
  actorUserId: string,
  workspaceId: string,
  input: AccountTransferInput,
): Promise<{ fromTransactionId: string; toTransactionId: string }> {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Pick two different accounts");
  }
  const amount = money(input.amount);
  if (compare(amount, money(0)) <= 0) {
    throw new Error("Enter a positive amount — the direction comes from the accounts");
  }
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const date = calendarDate(input.date);

  return rlsClientFor(actorUserId).run(async (tx) => {
    const [fromAccount, toAccount] = await Promise.all([
      tx.account.findUnique({ where: { id: input.fromAccountId } }),
      tx.account.findUnique({ where: { id: input.toAccountId } }),
    ]);
    if (!fromAccount || fromAccount.workspaceId !== workspaceId)
      throw new ForbiddenError("From-account not found or access denied");
    if (!toAccount || toAccount.workspaceId !== workspaceId)
      throw new ForbiddenError("To-account not found or access denied");

    const outDescription = `Transfer to ${toAccount.name}`;
    const inDescription = `Transfer from ${fromAccount.name}`;
    const out = await tx.transaction.create({
      data: {
        workspaceId,
        accountId: input.fromAccountId,
        date: toUtcDate(date),
        amount: mul(amount, "-1").toFixed(2),
        description: outDescription,
        source: "manual",
        isTransfer: true,
        dedupeHash: dedupeHash({
          accountId: input.fromAccountId,
          date,
          amount: mul(amount, "-1"),
          description: outDescription,
          runningBalance: null,
        }),
      },
    });
    const inflow = await tx.transaction.create({
      data: {
        workspaceId,
        accountId: input.toAccountId,
        date: toUtcDate(date),
        amount: amount.toFixed(2),
        description: inDescription,
        source: "manual",
        isTransfer: true,
        transferPairId: out.id,
        dedupeHash: dedupeHash({
          accountId: input.toAccountId,
          date,
          amount,
          description: inDescription,
          runningBalance: null,
        }),
      },
    });
    await tx.transaction.update({ where: { id: out.id }, data: { transferPairId: inflow.id } });
    return { fromTransactionId: out.id, toTransactionId: inflow.id };
  });
}

export interface TagOwnerDrawInput {
  fromWorkspaceId: string;
  toWorkspaceId: string;
  toAccountId: string;
  type?: TransferType;
  /** Either link an existing business outflow… */
  fromTransactionId?: string;
  /** …or create one from these. */
  fromAccountId?: string;
  amount?: string;
  date?: string;
}

export interface TagOwnerDrawResult {
  transferId: string;
  fromTransactionId: string;
  toTransactionId: string;
}

/**
 * Recognize a business outflow as Personal income — atomically. Privacy is
 * enforced by the database (forced RLS): the transfer row is visible only to a
 * member of both sides (the owner), never to a business-only teammate.
 */
export async function tagOwnerDraw(
  actorUserId: string,
  input: TagOwnerDrawInput,
): Promise<TagOwnerDrawResult> {
  if (input.fromWorkspaceId === input.toWorkspaceId) {
    throw new Error("from and to books must differ");
  }
  const hasSource =
    Boolean(input.fromTransactionId) ||
    (Boolean(input.fromAccountId) && Boolean(input.amount) && Boolean(input.date));
  if (!hasSource) {
    throw new Error("Provide fromTransactionId, or fromAccountId + amount + date");
  }
  // The owner is admin on both sides.
  await assertWorkspaceAccess(actorUserId, input.fromWorkspaceId, "admin");
  await assertWorkspaceAccess(actorUserId, input.toWorkspaceId, "admin");
  const type: TransferType = input.type ?? "owner_draw";

  return rlsClientFor(actorUserId).run(async (tx) => {
    const org = await repo.findWorkspaceOrg(tx, input.fromWorkspaceId);
    if (!org) throw new ForbiddenError("Book not found or access denied");

    let fromTransactionId: string;
    let incomeAmount: Money;
    let date: CalendarDate;

    if (input.fromTransactionId) {
      const existing = await tx.transaction.findUnique({ where: { id: input.fromTransactionId } });
      if (!existing) throw new ForbiddenError("Source transaction not found or access denied");
      fromTransactionId = existing.id;
      // Income = the magnitude of the (negative) outflow.
      incomeAmount = money(existing.amount.negated().toFixed(2));
      date = fromDbDate(existing.date);
    } else {
      const draw = money(input.amount!); // positive draw
      date = calendarDate(input.date!);
      const outflow = await tx.transaction.create({
        data: {
          workspaceId: input.fromWorkspaceId,
          accountId: input.fromAccountId!,
          date: toUtcDate(date),
          amount: mul(draw, "-1").toFixed(2),
          description: "Owner draw",
          source: "manual",
          dedupeHash: dedupeHash({
            accountId: input.fromAccountId!,
            date,
            amount: mul(draw, "-1"),
            description: "Owner draw",
            runningBalance: null,
          }),
        },
      });
      fromTransactionId = outflow.id;
      incomeAmount = draw;
    }

    const income = await tx.transaction.create({
      data: {
        workspaceId: input.toWorkspaceId,
        accountId: input.toAccountId,
        date: toUtcDate(date),
        amount: incomeAmount.toFixed(2),
        description: "Owner draw (income)",
        source: "manual",
        dedupeHash: dedupeHash({
          accountId: input.toAccountId,
          date,
          amount: incomeAmount,
          description: "Owner draw (income)",
          runningBalance: null,
        }),
      },
    });

    const transfer = await repo.insertTransfer(tx, {
      organizationId: org.organizationId,
      fromWorkspaceId: input.fromWorkspaceId,
      toWorkspaceId: input.toWorkspaceId,
      type,
      amount: incomeAmount.toFixed(2),
      date: toUtcDate(date),
      fromTransactionId,
      toTransactionId: income.id,
    });

    return { transferId: transfer.id, fromTransactionId, toTransactionId: income.id };
  });
}
