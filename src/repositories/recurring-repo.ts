import type { Prisma } from "@prisma/client";
import type { Db } from "@/repositories/db";

export function listSchedules(db: Db, workspaceId: string) {
  return db.recurringSchedule.findMany({ where: { workspaceId } });
}

export function insertBillsSkipDuplicates(db: Db, data: Prisma.BillCreateManyInput[]) {
  return db.bill.createMany({ data, skipDuplicates: true });
}

export function updateScheduleNextRun(db: Db, id: string, nextRunDate: Date) {
  return db.recurringSchedule.update({ where: { id }, data: { nextRunDate } });
}
