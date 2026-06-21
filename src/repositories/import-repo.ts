import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function listAccountHashes(db: Db, accountId: string) {
  return db.transaction.findMany({ where: { accountId }, select: { dedupeHash: true } });
}

export function insertBatch(db: Db, data: Prisma.ImportBatchUncheckedCreateInput) {
  return db.importBatch.create({ data });
}

export function insertTransactionsMany(db: Db, data: Prisma.TransactionCreateManyInput[]) {
  return db.transaction.createMany({ data });
}

export function findBatch(db: Db, id: string) {
  return db.importBatch.findUnique({ where: { id } });
}

export function deleteBatchTransactions(db: Db, batchId: string) {
  return db.transaction.deleteMany({ where: { importBatchId: batchId } });
}

export function archiveBatch(db: Db, id: string) {
  return db.importBatch.update({ where: { id }, data: { archivedAt: new Date(), status: "undone" } });
}
