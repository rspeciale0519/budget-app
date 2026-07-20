import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function listDebtsByWorkspace(db: Db, workspaceId: string) {
  return db.debt.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}

export function listGoalsByWorkspace(db: Db, workspaceId: string) {
  return db.goal.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}

export function insertGoal(db: Db, data: Prisma.GoalUncheckedCreateInput) {
  return db.goal.create({ data });
}
export function findGoal(db: Db, id: string) {
  return db.goal.findUnique({ where: { id } });
}
export function updateGoalRow(db: Db, id: string, data: Prisma.GoalUncheckedUpdateInput) {
  return db.goal.update({ where: { id }, data });
}
export function deleteGoalRow(db: Db, id: string) {
  return db.goal.delete({ where: { id } });
}

export function insertDebt(db: Db, data: Prisma.DebtUncheckedCreateInput) {
  return db.debt.create({ data });
}
export function findDebt(db: Db, id: string) {
  return db.debt.findUnique({ where: { id } });
}
export function updateDebtRow(db: Db, id: string, data: Prisma.DebtUncheckedUpdateInput) {
  return db.debt.update({ where: { id }, data });
}
export function deleteDebtRow(db: Db, id: string) {
  return db.debt.delete({ where: { id } });
}
