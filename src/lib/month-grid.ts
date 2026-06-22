import { calendarDate, addDays, toUtcDate, type CalendarDate } from "@/lib/calendar-date";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * A 6×7 Sunday-start grid of calendar dates covering the weeks that contain the
 * given month (leading/trailing days from adjacent months included). Pure —
 * the only `Date` use is `getUTCDay()` on a UTC-anchored date, so no tz drift.
 */
export function monthGrid(year: number, month1to12: number): CalendarDate[][] {
  const first = calendarDate(`${year}-${pad(month1to12)}-01`);
  const weekday = toUtcDate(first).getUTCDay(); // 0 = Sunday
  const start = addDays(first, -weekday);
  const rows: CalendarDate[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: CalendarDate[] = [];
    for (let c = 0; c < 7; c++) row.push(addDays(start, r * 7 + c));
    rows.push(row);
  }
  return rows;
}
