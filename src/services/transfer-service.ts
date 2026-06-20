import type { TransferType } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { dedupeHash } from "@/lib/dedupe";
import { money, mul, type Money } from "@/lib/money";
import { calendarDate, fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import * as repo from "@/repositories/transfer-repo";

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
    throw new Error("from and to workspaces must differ");
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
    if (!org) throw new ForbiddenError("Workspace not found or access denied");

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
