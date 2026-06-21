import { describe, it, expect } from "vitest";
import {
  calendarDate,
  addDays,
  compare,
  isBefore,
  isAfter,
  toUtcDate,
  fromDbDate,
  today,
} from "@/lib/calendar-date";

describe("calendar-date", () => {
  it("accepts and round-trips a valid date", () => {
    expect(calendarDate("2026-02-28")).toBe("2026-02-28");
  });

  it("rejects malformed or impossible dates", () => {
    expect(() => calendarDate("2026-13-01")).toThrow();
    expect(() => calendarDate("2026-02-30")).toThrow();
    expect(() => calendarDate("2026-6-1")).toThrow(); // not zero-padded
    expect(() => calendarDate("not-a-date")).toThrow();
  });

  it("adds days across month and year boundaries (no tz drift)", () => {
    expect(addDays(calendarDate("2026-02-28"), 1)).toBe("2026-03-01"); // 2026 not leap
    expect(addDays(calendarDate("2024-02-28"), 1)).toBe("2024-02-29"); // 2024 leap
    expect(addDays(calendarDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(calendarDate("2026-03-01"), -1)).toBe("2026-02-28");
  });

  it("converts to UTC midnight Date and back", () => {
    const d = toUtcDate(calendarDate("2026-06-20"));
    expect(d.toISOString()).toBe("2026-06-20T00:00:00.000Z");
    expect(fromDbDate(new Date("2026-06-20T00:00:00.000Z"))).toBe("2026-06-20");
  });

  it("survives a Date stored at UTC midnight regardless of reader", () => {
    // A @db.Date round-trip: a positive UTC-offset reader must not shift the day.
    expect(fromDbDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01-01");
  });

  it("compares chronologically", () => {
    expect(compare(calendarDate("2026-01-01"), calendarDate("2026-12-31"))).toBe(-1);
    expect(compare(calendarDate("2026-12-31"), calendarDate("2026-01-01"))).toBe(1);
    expect(compare(calendarDate("2026-05-05"), calendarDate("2026-05-05"))).toBe(0);
    expect(isBefore(calendarDate("2026-01-01"), calendarDate("2026-01-02"))).toBe(true);
    expect(isAfter(calendarDate("2026-01-02"), calendarDate("2026-01-01"))).toBe(true);
  });

  it("today() returns a well-formed calendar date", () => {
    expect(today("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
