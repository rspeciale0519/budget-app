import type { Db } from "@/repositories/db";

export function findByCategory(db: Db, workspaceId: string, categoryId: string, period: string) {
  return db.budget.findFirst({ where: { workspaceId, categoryId, period } });
}

/** Find-then-update/create (no reliance on the DB unique constraint for upsert
 * semantics, mirroring layout-repo). Caller passes a transaction client. */
export async function upsertAmount(
  db: Db,
  input: { workspaceId: string; categoryId: string; period: string; amount: string },
) {
  const existing = await findByCategory(db, input.workspaceId, input.categoryId, input.period);
  if (existing) return db.budget.update({ where: { id: existing.id }, data: { amount: input.amount } });
  return db.budget.create({ data: input });
}

export function listByWorkspace(db: Db, workspaceId: string) {
  return db.budget.findMany({ where: { workspaceId }, orderBy: { categoryId: "asc" } });
}

export function deleteById(db: Db, id: string) {
  return db.budget.delete({ where: { id } });
}
