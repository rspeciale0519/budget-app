import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertIncomeSource(db: Db, data: Prisma.IncomeSourceUncheckedCreateInput) {
  return db.incomeSource.create({ data });
}

export function updateIncomeSourceRow(db: Db, id: string, data: Prisma.IncomeSourceUncheckedUpdateInput) {
  return db.incomeSource.update({ where: { id }, data });
}

export function deleteIncomeSource(db: Db, id: string) {
  return db.incomeSource.delete({ where: { id } });
}

export function findIncomeSource(db: Db, id: string) {
  return db.incomeSource.findUnique({ where: { id } });
}

export function listByWorkspace(db: Db, workspaceId: string) {
  return db.incomeSource.findMany({ where: { workspaceId }, orderBy: { nextDate: "asc" } });
}
