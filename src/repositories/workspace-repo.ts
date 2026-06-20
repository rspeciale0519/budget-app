import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertWorkspace(db: Db, data: Prisma.WorkspaceUncheckedCreateInput) {
  return db.workspace.create({ data });
}

export function insertWorkspaceMembership(
  db: Db,
  data: Prisma.WorkspaceMembershipUncheckedCreateInput,
) {
  return db.workspaceMembership.create({ data });
}

export function updateWorkspaceRow(db: Db, id: string, data: Prisma.WorkspaceUncheckedUpdateInput) {
  return db.workspace.update({ where: { id }, data });
}

export function findWorkspace(db: Db, id: string) {
  return db.workspace.findUnique({ where: { id } });
}
