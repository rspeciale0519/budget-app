import { describe, it, expect } from "vitest";
import { periodRange } from "@/services/dashboard/period";
import { calendarDate } from "@/lib/calendar-date";

describe("periodRange", () => {
  const today = calendarDate("2026-06-20"); // a Saturday

  it("month → first of month to first of next month", () => {
    expect(periodRange("month", today)).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });

  it("week → Monday-anchored, exclusive end", () => {
    expect(periodRange("week", today)).toEqual({ start: "2026-06-15", end: "2026-06-22" });
  });

  it("quarter → first of quarter to first of next quarter", () => {
    expect(periodRange("quarter", today)).toEqual({ start: "2026-04-01", end: "2026-07-01" });
  });

  it("year → Jan 1 to next Jan 1", () => {
    expect(periodRange("year", today)).toEqual({ start: "2026-01-01", end: "2027-01-01" });
  });

  it("month handles December → next January", () => {
    expect(periodRange("month", calendarDate("2026-12-15"))).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });
});
