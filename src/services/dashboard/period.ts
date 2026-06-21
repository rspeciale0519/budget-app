import { addDays, fromDbDate, type CalendarDate } from "@/lib/calendar-date";

export type Period = "week" | "month" | "quarter" | "year";

function monthOf(d: CalendarDate): { year: number; month: number } {
  const parts = d.split("-");
  return { year: Number(parts[0]), month: Number(parts[1]) };
}

/** A normalized calendar date from y/m/day (overflow rolls over via UTC). */
function ymd(year: number, month: number, day: number): CalendarDate {
  return fromDbDate(new Date(Date.UTC(year, month - 1, day)));
}

/** Inclusive start, exclusive end (first day of the next period). */
export function periodRange(period: Period, today: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  const { year, month } = monthOf(today);
  switch (period) {
    case "month":
      return { start: ymd(year, month, 1), end: ymd(year, month + 1, 1) };
    case "year":
      return { start: ymd(year, 1, 1), end: ymd(year + 1, 1, 1) };
    case "quarter": {
      const qStart = Math.floor((month - 1) / 3) * 3 + 1;
      return { start: ymd(year, qStart, 1), end: ymd(year, qStart + 3, 1) };
    }
    case "week": {
      const dow = new Date(`${today}T00:00:00.000Z`).getUTCDay(); // 0=Sun..6=Sat
      const mondayOffset = (dow + 6) % 7; // Mon=0
      const start = addDays(today, -mondayOffset);
      return { start, end: addDays(start, 7) };
    }
  }
}
