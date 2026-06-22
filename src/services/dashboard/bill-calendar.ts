import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { monthGrid } from "@/lib/month-grid";
import { addDays, compare, fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { money, format } from "@/lib/money";

export type DayStatus = "overdue" | "soon" | "scheduled" | "paid";

export interface CalendarEvent {
  billId: string;
  vendor: string;
  amount: string;
  status: DayStatus;
}

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarDay[][];
}

function statusOf(billStatus: string, due: CalendarDate, today: CalendarDate): DayStatus {
  if (billStatus === "paid") return "paid";
  if (compare(due, today) < 0) return "overdue";
  if (compare(due, addDays(today, 7)) <= 0) return "soon";
  return "scheduled";
}

export async function billCalendar(
  userId: string,
  workspaceId: string,
  year: number,
  month: number,
  today: CalendarDate,
): Promise<CalendarMonth> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");

  const grid = monthGrid(year, month);
  const first = grid[0]![0]!;
  const last = grid[5]![6]!;

  const byDate = await rlsClientFor(userId).run(async (tx) => {
    const bills = await tx.bill.findMany({
      where: {
        workspaceId,
        dueDate: { gte: toUtcDate(first), lt: toUtcDate(addDays(last, 1)) },
      },
      orderBy: { dueDate: "asc" },
    });
    const map = new Map<string, CalendarEvent[]>();
    for (const b of bills) {
      const due = fromDbDate(b.dueDate);
      const event: CalendarEvent = {
        billId: b.id,
        vendor: b.vendor,
        amount: format(money(b.amount.toFixed(2))),
        status: statusOf(b.status, due, today),
      };
      const list = map.get(due) ?? [];
      list.push(event);
      map.set(due, list);
    }
    return map;
  });

  const weeks: CalendarDay[][] = grid.map((row) =>
    row.map((date) => ({
      date,
      inMonth: Number(date.split("-")[1]) === month,
      isToday: compare(date, today) === 0,
      events: byDate.get(date) ?? [],
    })),
  );

  return { year, month, weeks };
}
