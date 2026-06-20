import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertAudit(db: Db, data: Prisma.AuditLogUncheckedCreateInput) {
  return db.auditLog.create({ data });
}

export function listAuditByOrg(
  db: Db,
  organizationId: string,
  where: Prisma.AuditLogWhereInput,
  take: number,
) {
  return db.auditLog.findMany({
    where: { organizationId, ...where },
    orderBy: { at: "desc" },
    take,
  });
}
