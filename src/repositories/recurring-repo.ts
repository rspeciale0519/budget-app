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

export function insertSchedule(db: Db, data: Prisma.RecurringScheduleUncheckedCreateInput) {
  return db.recurringSchedule.create({ data });
}

export function findSchedule(db: Db, id: string) {
  return db.recurringSchedule.findUnique({ where: { id } });
}

export function deleteScheduleRow(db: Db, id: string) {
  return db.recurringSchedule.delete({ where: { id } });
}

/** Remove the not-yet-due, still-unpaid bills a canceled schedule materialized.
 * Past and paid bills are history and stay. */
export function deleteFutureUnpaidBills(db: Db, scheduleId: string, after: Date) {
  return db.bill.deleteMany({
    where: { recurringScheduleId: scheduleId, status: "unpaid", dueDate: { gt: after } },
  });
}
