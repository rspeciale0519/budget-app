import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertTransfer(db: Db, data: Prisma.WorkspaceTransferUncheckedCreateInput) {
  return db.workspaceTransfer.create({ data });
}

export function findWorkspaceOrg(db: Db, workspaceId: string) {
  return db.workspace.findUnique({ where: { id: workspaceId }, select: { organizationId: true } });
}
