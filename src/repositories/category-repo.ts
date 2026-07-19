import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertCategory(db: Db, data: Prisma.CategoryUncheckedCreateInput) {
  return db.category.create({ data });
}

export function insertManyCategories(db: Db, data: Prisma.CategoryCreateManyInput[]) {
  return db.category.createMany({ data });
}

export function listCategoriesByWorkspace(db: Db, workspaceId: string) {
  return db.category.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });
}

export function updateCategoryRow(db: Db, id: string, data: Prisma.CategoryUncheckedUpdateInput) {
  return db.category.update({ where: { id }, data });
}

export function deleteCategoryRow(db: Db, id: string) {
  return db.category.delete({ where: { id } });
}

export function findCategory(db: Db, id: string) {
  return db.category.findUnique({ where: { id } });
}

export function insertCategoryRule(db: Db, data: Prisma.CategoryRuleUncheckedCreateInput) {
  return db.categoryRule.create({ data });
}

export function listRulesByWorkspace(db: Db, workspaceId: string) {
  return db.categoryRule.findMany({
    where: { workspaceId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}
