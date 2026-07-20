import { fromDbDate, compare, type CalendarDate } from "@/lib/calendar-date";

/**
 * The next date a debt's payment is due, from its day-of-month. Days 29–31
 * clamp to the month's last day (a "due day 31" card is due Feb 28). Pure.
 */
export function nextDebtDueDate(dueDay: number, today: CalendarDate): CalendarDate {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const build = (year: number, monthIndex0: number): CalendarDate => {
    const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
    return fromDbDate(new Date(Date.UTC(year, monthIndex0, Math.min(dueDay, lastDay))));
  };
  const thisMonth = build(y, m - 1);
  if (compare(thisMonth, today) >= 0) return thisMonth;
  return build(m === 12 ? y + 1 : y, m === 12 ? 0 : m);
}
