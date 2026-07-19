import type { z } from "zod";
import type { Db } from "@/repositories/db";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { createCategorySchema, updateCategorySchema } from "@/lib/zod/entities";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import * as repo from "@/repositories/category-repo";

/** Seed the default category set for a new workspace (privileged caller). */
export function seedDefaultCategories(db: Db, workspaceId: string) {
  return repo.insertManyCategories(
    db,
    DEFAULT_CATEGORIES.map((c) => ({ workspaceId, name: c.name, kind: c.kind })),
  );
}

export async function createCategory(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof createCategorySchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createCategorySchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.insertCategory(tx, {
      workspaceId,
      name: data.name,
      kind: data.kind,
      parentId: data.parentId,
    }),
  );
}

export async function listCategories(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.listCategoriesByWorkspace(tx, workspaceId));
}

export async function updateCategory(
  actorUserId: string,
  categoryId: string,
  input: z.input<typeof updateCategorySchema>,
) {
  const existing = await rlsClientFor(actorUserId).run((tx) => repo.findCategory(tx, categoryId));
  if (!existing) throw new ForbiddenError("Category not found or access denied");
  await assertWorkspaceAccess(actorUserId, existing.workspaceId, "admin");
  const data = updateCategorySchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) => repo.updateCategoryRow(tx, categoryId, { name: data.name }));
}

/** Deleting a category is safe without a migration: transactions reference it
 * with onDelete: SetNull, so their history stays intact and just becomes
 * uncategorized — there's no "archived" state to build. */
export async function deleteCategory(actorUserId: string, categoryId: string): Promise<void> {
  const existing = await rlsClientFor(actorUserId).run((tx) => repo.findCategory(tx, categoryId));
  if (!existing) throw new ForbiddenError("Category not found or access denied");
  await assertWorkspaceAccess(actorUserId, existing.workspaceId, "admin");
  await rlsClientFor(actorUserId).run((tx) => repo.deleteCategoryRow(tx, categoryId));
}
