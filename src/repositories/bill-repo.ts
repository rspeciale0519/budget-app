import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function insertBill(db: Db, data: Prisma.BillUncheckedCreateInput) {
  return db.bill.create({ data });
}

export function updateBillRow(db: Db, id: string, data: Prisma.BillUncheckedUpdateInput) {
  return db.bill.update({ where: { id }, data });
}

export function deleteBill(db: Db, id: string) {
  return db.bill.delete({ where: { id } });
}

export function findBill(db: Db, id: string) {
  return db.bill.findUnique({ where: { id } });
}

export function listByWorkspace(db: Db, workspaceId: string) {
  return db.bill.findMany({ where: { workspaceId }, orderBy: { dueDate: "asc" } });
}

export function listOpenByWorkspace(db: Db, workspaceId: string) {
  return db.bill.findMany({
    where: { workspaceId, status: { in: ["unpaid", "scheduled", "overdue"] } },
    orderBy: { dueDate: "asc" },
  });
}
