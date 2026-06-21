import type { Db } from "@/repositories/db";

export function listDebtsByWorkspace(db: Db, workspaceId: string) {
  return db.debt.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}

export function listGoalsByWorkspace(db: Db, workspaceId: string) {
  return db.goal.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
}
