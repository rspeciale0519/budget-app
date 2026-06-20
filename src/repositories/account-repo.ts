import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertAccount(db: Db, data: Prisma.AccountUncheckedCreateInput) {
  return db.account.create({ data });
}

export function updateAccountRow(db: Db, id: string, data: Prisma.AccountUncheckedUpdateInput) {
  return db.account.update({ where: { id }, data });
}

export function findAccount(db: Db, id: string) {
  return db.account.findUnique({ where: { id } });
}

export function listAccountsByWorkspace(db: Db, workspaceId: string) {
  return db.account.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export function sumTransactions(db: Db, accountId: string) {
  return db.transaction.aggregate({ where: { accountId }, _sum: { amount: true } });
}
