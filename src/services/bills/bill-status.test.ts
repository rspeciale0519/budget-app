import { describe, it, expect } from "vitest";
import { billDisplayStatus } from "@/services/bills/bill-status";
import { calendarDate, addDays } from "@/lib/calendar-date";

const today = calendarDate("2026-06-20");

describe("billDisplayStatus", () => {
  it("marks a paid bill paid regardless of date", () => {
    expect(billDisplayStatus("paid", addDays(today, -5), today)).toEqual({ key: "paid", label: "Paid" });
    expect(billDisplayStatus("paid", addDays(today, 10), today)).toEqual({ key: "paid", label: "Paid" });
  });

  it("calls a past-due unpaid bill overdue", () => {
    expect(billDisplayStatus("unpaid", addDays(today, -1), today)).toEqual({ key: "overdue", label: "Overdue" });
  });

  it("distinguishes today, tomorrow, and the next-7-days window", () => {
    expect(billDisplayStatus("unpaid", today, today)).toEqual({ key: "today", label: "Due today" });
    expect(billDisplayStatus("unpaid", addDays(today, 1), today)).toEqual({ key: "soon", label: "Tomorrow" });
    expect(billDisplayStatus("unpaid", addDays(today, 5), today)).toEqual({ key: "soon", label: "in 5 days" });
    expect(billDisplayStatus("unpaid", addDays(today, 7), today)).toEqual({ key: "soon", label: "in 7 days" });
  });

  it("calls anything beyond 7 days due later, never 'scheduled'", () => {
    const r = billDisplayStatus("unpaid", addDays(today, 8), today);
    expect(r).toEqual({ key: "later", label: "Due later" });
    expect(r.label.toLowerCase()).not.toContain("scheduled");
  });

  it("ignores a stray DB 'scheduled' status and derives from the date", () => {
    expect(billDisplayStatus("scheduled", addDays(today, 3), today)).toEqual({ key: "soon", label: "in 3 days" });
    expect(billDisplayStatus("scheduled", addDays(today, -2), today)).toEqual({ key: "overdue", label: "Overdue" });
  });
});
