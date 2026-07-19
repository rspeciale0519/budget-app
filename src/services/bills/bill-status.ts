import { addDays, compare, diffDays, type CalendarDate } from "@/lib/calendar-date";

export type BillDisplayStatus = "overdue" | "today" | "soon" | "later" | "paid";

export interface BillDisplay {
  key: BillDisplayStatus;
  label: string;
}

/**
 * The one place that decides how a bill reads. The dashboard, the bill calendar
 * and the tiling panes each used to derive this themselves and had drifted — and
 * all three carried a "Scheduled" label that sounds like autopay is arranged (it
 * never was; nothing in the app sets that state). "paid" comes from the
 * Bill.status column; every other reading is a function of the due date relative
 * to today, so the whole app agrees on what a bill's chip says.
 */
export function billDisplayStatus(
  dbStatus: string,
  due: CalendarDate,
  today: CalendarDate,
): BillDisplay {
  if (dbStatus === "paid") return { key: "paid", label: "Paid" };
  const cmp = compare(due, today);
  if (cmp < 0) return { key: "overdue", label: "Overdue" };
  if (cmp === 0) return { key: "today", label: "Due today" };
  if (compare(due, addDays(today, 1)) === 0) return { key: "soon", label: "Tomorrow" };
  if (compare(due, addDays(today, 7)) <= 0) return { key: "soon", label: `in ${diffDays(today, due)} days` };
  return { key: "later", label: "Due later" };
}
