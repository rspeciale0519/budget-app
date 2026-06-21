import { prismaAdmin } from "@/lib/prisma-admin";
import { addDays, compare, fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { stepByFrequency } from "@/lib/recurrence";
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
