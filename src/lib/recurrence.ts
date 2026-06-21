import type { Frequency } from "@prisma/client";
import { addDays, fromDbDate, type CalendarDate } from "@/lib/calendar-date";

function dayOf(d: CalendarDate): number {
  return Number(d.split("-")[2]);
}

/** Add months with end-of-month clamping; optionally override the day. */
export function addMonths(d: CalendarDate, n: number, dayOverride?: number | null): CalendarDate {
  const parts = d.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const day = dayOverride ?? dayOf(d);
  const monthIndex = m - 1 + n;
  const year = y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12; // 0-based
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromDbDate(new Date(Date.UTC(year, month, Math.min(day, lastDay))));
}

/** Advance a date by one occurrence of the given frequency (shared by income
 * projection and recurring-bill materialization, so they never diverge). */
export function stepByFrequency(
  d: CalendarDate,
  freq: Frequency,
  interval: number,
  dayOfMonth: number | null,
): CalendarDate {
  switch (freq) {
    case "weekly":
      return addDays(d, 7 * interval);
    case "monthly":
      return addMonths(d, interval, dayOfMonth);
    case "quarterly":
      return addMonths(d, 3 * interval, dayOfMonth);
    case "annual":
      return addMonths(d, 12 * interval, dayOfMonth);
    case "custom":
      return addMonths(d, interval, dayOfMonth);
  }
}
