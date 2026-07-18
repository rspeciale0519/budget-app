import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertTransaction(db: Db, data: Prisma.TransactionUncheckedCreateInput) {
  return db.transaction.create({ data });
}

export function updateTransactionRow(db: Db, id: string, data: Prisma.TransactionUncheckedUpdateInput) {
  return db.transaction.update({ where: { id }, data });
}

export function deleteTransaction(db: Db, id: string) {
  return db.transaction.delete({ where: { id } });
}

export function findTransaction(db: Db, id: string) {
  return db.transaction.findUnique({ where: { id } });
}

export function listByWorkspace(
  db: Db,
  workspaceId: string,
  skip: number,
  take: number,
  where: Prisma.TransactionWhereInput = {},
) {
  return db.transaction.findMany({
    where: { workspaceId, ...where },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip,
    take,
  });
}

export function countByWorkspace(db: Db, workspaceId: string, where: Prisma.TransactionWhereInput = {}) {
  return db.transaction.count({ where: { workspaceId, ...where } });
}

/** Re-open any bill this transaction was paying (referential cleanup, spec §9). */
export function reopenBillsPaidBy(db: Db, transactionId: string) {
  return db.bill.updateMany({
    where: { paidTransactionId: transactionId },
    data: { status: "unpaid", paidTransactionId: null },
  });
}
