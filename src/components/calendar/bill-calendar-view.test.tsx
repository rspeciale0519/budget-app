import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { BillCalendarView } from "@/components/calendar/bill-calendar-view";
import { ToastProvider } from "@/components/ui/toast";
import type { CalendarMonth, CalendarSummary } from "@/services/dashboard/bill-calendar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const summary: CalendarSummary = {
  hasBills: true,
  total: "$1,250.00",
  paid: "$50.00",
  unpaid: "$1,200.00",
};

const fixture: CalendarMonth = {
  year: 2026,
  month: 7,
  summary,
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

const agendaFixture: CalendarMonth = {
  year: 2026,
  month: 7,
  summary,
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

function render(month: CalendarMonth) {
  return renderToString(
    <ToastProvider>
      <BillCalendarView month={month} workspaceId="w1" />
    </ToastProvider>,
  );
}

describe("BillCalendarView", () => {
  it("renders the month summary, a legend, and event chips (grid)", () => {
    const html = render(fixture);
    expect(html).toContain("Su");
    expect(html).toContain("Late Co");
    expect(html).toContain("$1,200.00"); // still-to-pay from the summary
    expect(html).toContain("Due later"); // legend label
  });

  it("renders an agenda row for an in-month bill, marking today", () => {
    const html = render(agendaFixture);
    expect(html).toContain("Rent Co");
    expect(html).toContain("· Today");
  });

  it("shows the empty-month message when there are no bills", () => {
    const empty: CalendarMonth = {
      ...fixture,
      summary: { hasBills: false, total: "$0.00", paid: "$0.00", unpaid: "$0.00" },
      weeks: fixture.weeks.map((w) => w.map((d) => ({ ...d, events: [] }))),
    };
    const html = render(empty);
    expect(html).toContain("No bills this month");
  });
});
