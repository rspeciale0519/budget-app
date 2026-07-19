import type { z } from "zod";
import type { Bill } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { createBillSchema, markBillPaidSchema } from "@/lib/zod/entities";
import { audit } from "@/services/audit-service";
import { dedupeHash } from "@/lib/dedupe";
import { money } from "@/lib/money";
import { type CalendarDate, addDays, fromDbDate, toUtcDate } from "@/lib/calendar-date";
import * as repo from "@/repositories/bill-repo";

export async function createBill(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof createBillSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createBillSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.insertBill(tx, {
      workspaceId,
      vendor: data.vendor,
      amount: data.amount.toFixed(2),
      dueDate: toUtcDate(data.dueDate),
      type: data.type,
      categoryId: data.categoryId,
      payFromAccountId: data.payFromAccountId,
      notes: data.notes,
    }),
  );
}

async function loadBillForAdmin(actorUserId: string, billId: string): Promise<Bill> {
  const bill = await rlsClientFor(actorUserId).run((tx) => repo.findBill(tx, billId));
  if (!bill) throw new ForbiddenError("Bill not found or access denied");
  await assertWorkspaceAccess(actorUserId, bill.workspaceId, "admin");
  return bill;
}

export async function updateBill(actorUserId: string, billId: string, input: z.input<typeof createBillSchema>) {
  const bill = await loadBillForAdmin(actorUserId, billId);
  const data = createBillSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateBillRow(tx, bill.id, {
      vendor: data.vendor,
      amount: data.amount.toFixed(2),
      dueDate: toUtcDate(data.dueDate),
      type: data.type,
      categoryId: data.categoryId ?? null,
      payFromAccountId: data.payFromAccountId ?? null,
      notes: data.notes ?? null,
    }),
  );
}

export async function deleteBill(actorUserId: string, billId: string) {
  const bill = await loadBillForAdmin(actorUserId, billId);
  return rlsClientFor(actorUserId).run((tx) => repo.deleteBill(tx, bill.id));
}

export async function markPaid(
  actorUserId: string,
  billId: string,
  input: z.input<typeof markBillPaidSchema>,
) {
  const bill = await loadBillForAdmin(actorUserId, billId);
  const data = markBillPaidSchema.parse(input);
  return rlsClientFor(actorUserId).run(async (tx) => {
    let transactionId = data.transactionId;
    if (!transactionId && data.payFromAccountId) {
      const dueCal = fromDbDate(bill.dueDate);
      const amount = money(bill.amount.negated().toFixed(2));
      const created = await tx.transaction.create({
        data: {
          workspaceId: bill.workspaceId,
          accountId: data.payFromAccountId,
          date: bill.dueDate,
          amount: amount.toFixed(2),
          description: bill.vendor,
          source: "manual",
          dedupeHash: dedupeHash({
            accountId: data.payFromAccountId,
            date: dueCal,
            amount,
            description: bill.vendor,
            runningBalance: null,
          }),
          billId: bill.id,
        },
      });
      transactionId = created.id;
    } else if (transactionId) {
      await tx.transaction.update({ where: { id: transactionId }, data: { billId: bill.id } });
    }
    const updated = await repo.updateBillRow(tx, bill.id, { status: "paid", paidTransactionId: transactionId });
    await audit(tx, {
      userId: actorUserId,
      workspaceId: bill.workspaceId,
      action: "mark_paid",
      entityType: "Bill",
      entityId: bill.id,
      after: { status: "paid", paidTransactionId: transactionId },
    });
    return updated;
  });
}

/** Mark a bill paid with NO linked transaction (dashboard one-click). Avoids
 * silently booking against an arbitrary account; account-linked payment stays
 * in the explicit markPaid path. */
export async function markPaidStandalone(actorUserId: string, billId: string) {
  const bill = await loadBillForAdmin(actorUserId, billId);
  return rlsClientFor(actorUserId).run(async (tx) => {
    const updated = await repo.updateBillRow(tx, bill.id, { status: "paid", paidTransactionId: null });
    await audit(tx, {
      userId: actorUserId,
      workspaceId: bill.workspaceId,
      action: "mark_paid_standalone",
      entityType: "Bill",
      entityId: bill.id,
      after: { status: "paid" },
    });
    return updated;
  });
}

export async function markUnpaid(actorUserId: string, billId: string) {
  const bill = await loadBillForAdmin(actorUserId, billId);
  return rlsClientFor(actorUserId).run(async (tx) => {
    if (bill.paidTransactionId) {
      await tx.transaction.updateMany({ where: { id: bill.paidTransactionId }, data: { billId: null } });
    }
    const updated = await repo.updateBillRow(tx, bill.id, { status: "unpaid", paidTransactionId: null });
    await audit(tx, {
      userId: actorUserId,
      workspaceId: bill.workspaceId,
      action: "mark_unpaid",
      entityType: "Bill",
      entityId: bill.id,
      after: { status: "unpaid" },
    });
    return updated;
  });
}

export async function listBills(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.listByWorkspace(tx, workspaceId));
}

export interface UpcomingOverdue {
  overdue: Bill[];
  next7: Bill[];
  next30: Bill[];
}

export async function upcomingAndOverdue(
  actorUserId: string,
  workspaceId: string,
  today: CalendarDate,
): Promise<UpcomingOverdue> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const open = await rlsClientFor(actorUserId).run((tx) => repo.listOpenByWorkspace(tx, workspaceId));
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);
  const dueOf = (b: Bill) => fromDbDate(b.dueDate);
  return {
    overdue: open.filter((b) => dueOf(b) < today),
    next7: open.filter((b) => dueOf(b) >= today && dueOf(b) <= in7),
    next30: open.filter((b) => dueOf(b) >= today && dueOf(b) <= in30),
  };
}
