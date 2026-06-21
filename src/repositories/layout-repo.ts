import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function findByName(db: Db, userId: string, organizationId: string, name: string) {
  return db.layout.findFirst({ where: { userId, organizationId, name } });
}

export function createLayout(db: Db, data: Prisma.LayoutUncheckedCreateInput) {
  return db.layout.create({ data });
}

export function updateConfig(db: Db, id: string, config: Prisma.InputJsonValue) {
  return db.layout.update({ where: { id }, data: { config } });
}

export function findById(db: Db, id: string) {
  return db.layout.findUnique({ where: { id } });
}

export function listByOrg(db: Db, userId: string, organizationId: string) {
  return db.layout.findMany({ where: { userId, organizationId }, orderBy: { name: "asc" } });
}

export function deleteById(db: Db, id: string) {
  return db.layout.delete({ where: { id } });
}
