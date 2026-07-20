import type { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { audit } from "@/services/audit-service";
import { createRecurringBillSchema } from "@/lib/zod/entities";
import { addDays, compare, fromDbDate, toUtcDate, today as todayFn, type CalendarDate } from "@/lib/calendar-date";
import { stepByFrequency } from "@/lib/recurrence";
import { money, format } from "@/lib/money";
import * as repo from "@/repositories/recurring-repo";

// In-process "materialized today" marker so the aggregator doesn't re-run on
// every render. Idempotency is guaranteed by the DB anyway (see below).
const materializedToday = new Map<string, string>();

/**
 * Materialize concrete Bill rows from each schedule across a rolling horizon.
 * Race-safe + idempotent: inserts use createMany({ skipDuplicates }) against the
 * Bill(recurringScheduleId, dueDate) unique constraint, so a second (even
 * concurrent) call creates 0 duplicates. Runs via the privileged client.
 */
export async function materializeRecurring(
  workspaceId: string,
  today: CalendarDate,
  horizonDays = 90,
): Promise<{ created: number }> {
  const schedules = await repo.listSchedules(prismaAdmin, workspaceId);
  const end = addDays(today, horizonDays);
  let created = 0;

  for (const s of schedules) {
    const scheduleEnd = s.endDate ? fromDbDate(s.endDate) : null;
    const dueDates: CalendarDate[] = [];
    let cur = fromDbDate(s.nextRunDate);
    for (let guard = 0; compare(cur, end) <= 0 && guard < 2000; guard++) {
      if (scheduleEnd && compare(cur, scheduleEnd) > 0) break;
      dueDates.push(cur);
      cur = stepByFrequency(cur, s.frequency, s.interval, s.dayOfMonth);
    }
    if (dueDates.length > 0) {
      const result = await repo.insertBillsSkipDuplicates(
        prismaAdmin,
        dueDates.map((d) => ({
          workspaceId,
          vendor: s.templateVendor,
          amount: s.templateAmount.toFixed(2),
          dueDate: toUtcDate(d),
          status: "unpaid" as const,
          type: "bill" as const,
          categoryId: s.templateCategoryId,
          recurringScheduleId: s.id,
        })),
      );
      created += result.count;
    }
    // Advance nextRunDate past the horizon so the next run starts fresh.
    await repo.updateScheduleNextRun(prismaAdmin, s.id, toUtcDate(cur));
  }

  return { created };
}

/** Once-per-day-per-workspace guard the dashboard aggregator calls. */
export async function materializeDueWorkspaces(workspaceId: string, today: CalendarDate): Promise<void> {
  if (materializedToday.get(workspaceId) === today) return;
  await materializeRecurring(workspaceId, today);
  materializedToday.set(workspaceId, today);
}

// ── User-facing schedule CRUD ────────────────────────────────────────────────

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  annual: "yearly",
  custom: "monthly",
};

export interface RecurringScheduleView {
  id: string;
  vendor: string;
  amount: string;
  /** e.g. "repeats monthly" */
  frequencyLabel: string;
  nextDueDate: CalendarDate;
}

export async function createRecurringBill(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof createRecurringBillSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createRecurringBillSchema.parse(input);
  const schedule = await rlsClientFor(actorUserId).run(async (tx) => {
    if (data.categoryId) {
      const cat = await tx.category.findFirst({ where: { id: data.categoryId, workspaceId }, select: { id: true } });
      if (!cat) throw new ForbiddenError("Category not in this book");
    }
    const s = await repo.insertSchedule(tx, {
      workspaceId,
      frequency: data.frequency,
      interval: 1,
      dayOfMonth: data.frequency === "weekly" ? null : Number(data.firstDueDate.split("-")[2]),
      startDate: toUtcDate(data.firstDueDate),
      nextRunDate: toUtcDate(data.firstDueDate),
      templateVendor: data.vendor,
      templateAmount: data.amount.toFixed(2),
      templateCategoryId: data.categoryId ?? null,
    });
    await audit(tx, {
      userId: actorUserId,
      workspaceId,
      action: "create",
      entityType: "RecurringSchedule",
      entityId: s.id,
      after: { vendor: data.vendor, frequency: data.frequency },
    });
    return s;
  });
  // Materialize immediately so the first bills appear without waiting for the
  // next dashboard load (bypasses the once-per-day guard on purpose).
  await materializeRecurring(workspaceId, todayFn());
  materializedToday.set(workspaceId, todayFn());
  return schedule;
}

export async function listRecurringSchedules(
  actorUserId: string,
  workspaceId: string,
): Promise<RecurringScheduleView[]> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const schedules = await rlsClientFor(actorUserId).run((tx) => repo.listSchedules(tx, workspaceId));
  const today = todayFn();
  return schedules.map((s) => {
    // The next USER-relevant due date is the earliest unpaid materialized bill at
    // or after today; nextRunDate has already advanced past the horizon. Keep it
    // simple and honest: derive from the schedule's own cadence starting at startDate.
    let next = fromDbDate(s.startDate);
    for (let guard = 0; compare(next, today) < 0 && guard < 2000; guard++) {
      next = stepByFrequency(next, s.frequency, s.interval, s.dayOfMonth);
    }
    return {
      id: s.id,
      vendor: s.templateVendor,
      amount: format(money(s.templateAmount.toFixed(2))),
      frequencyLabel: `repeats ${FREQUENCY_LABEL[s.frequency] ?? s.frequency}`,
      nextDueDate: next,
    };
  });
}

/** Cancel = stop repeating: remove the future unpaid bills it materialized, then
 * the schedule itself. Past and paid bills stay (onDelete: SetNull detaches them). */
export async function cancelRecurringSchedule(actorUserId: string, scheduleId: string) {
  const schedule = await rlsClientFor(actorUserId).run((tx) => repo.findSchedule(tx, scheduleId));
  if (!schedule) throw new ForbiddenError("Repeating bill not found or access denied");
  await assertWorkspaceAccess(actorUserId, schedule.workspaceId, "admin");
  return rlsClientFor(actorUserId).run(async (tx) => {
    const removed = await repo.deleteFutureUnpaidBills(tx, schedule.id, toUtcDate(todayFn()));
    await audit(tx, {
      userId: actorUserId,
      workspaceId: schedule.workspaceId,
      action: "delete",
      entityType: "RecurringSchedule",
      entityId: schedule.id,
      after: { vendor: schedule.templateVendor, futureBillsRemoved: removed.count },
    });
    await repo.deleteScheduleRow(tx, schedule.id);
    return { removedFutureBills: removed.count };
  });
}
