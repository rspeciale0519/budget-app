import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { BillCalendarView } from "@/components/calendar/bill-calendar-view";
import type { CalendarMonth } from "@/services/dashboard/bill-calendar";

const fixture: CalendarMonth = {
  year: 2026,
  month: 7,
  weeks: [
    [
      { date: "2026-06-28", inMonth: false, isToday: false, events: [] },
      { date: "2026-06-29", inMonth: false, isToday: false, events: [] },
      { date: "2026-06-30", inMonth: false, isToday: false, events: [{ billId: "b1", vendor: "Late Co", amount: "$50.00", status: "overdue", statusLabel: "Overdue" }] },
      { date: "2026-07-01", inMonth: true, isToday: true, events: [] },
      { date: "2026-07-02", inMonth: true, isToday: false, events: [] },
      { date: "2026-07-03", inMonth: true, isToday: false, events: [] },
      { date: "2026-07-04", inMonth: true, isToday: false, events: [] },
    ],
    ...Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => ({
        date: `2026-07-${String(5 + r * 7 + c).padStart(2, "0")}`,
        inMonth: true,
        isToday: false,
        events: [],
      })),
    ),
  ],
};

// An in-month bill on "today" — exercises the mobile agenda path.
const agendaFixture: CalendarMonth = {
  year: 2026,
  month: 7,
  weeks: Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const today = r === 0 && c === 0;
      return {
        date: `2026-07-${String(1 + r * 7 + c).padStart(2, "0")}`,
        inMonth: true,
        isToday: today,
        events: today
          ? [{ billId: "x", vendor: "Rent Co", amount: "$1,200.00", status: "soon" as const, statusLabel: "in 3 days" }]
          : [],
      };
    }),
  ),
};

describe("BillCalendarView", () => {
  it("renders weekday headers and event chips (grid)", () => {
    const html = renderToString(<BillCalendarView month={fixture} />);
    expect(html).toContain("Su");
    expect(html).toContain("Sa");
    expect(html).toContain("Late Co");
  });

  it("renders an agenda row for an in-month bill, marking today", () => {
    const html = renderToString(<BillCalendarView month={agendaFixture} />);
    expect(html).toContain("Rent Co");
    expect(html).toContain("· Today"); // agenda-only label (the grid uses a styled circle)
  });
});
