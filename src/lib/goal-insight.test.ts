import { describe, it, expect } from "vitest";
import { goalOnTrack } from "@/lib/goal-insight";
import { money } from "@/lib/money";
import { calendarDate } from "@/lib/calendar-date";

const today = calendarDate("2026-07-20");

describe("goalOnTrack", () => {
  it("reports reached when saved meets or beats target", () => {
    const r = goalOnTrack({ saved: money("5000"), target: money("5000"), targetDate: null, today });
    expect(r.reached).toBe(true);
    expect(r.label).toBe("Reached ✓");
  });

  it("shows the remaining amount when there is no target date", () => {
    const r = goalOnTrack({ saved: money("2000"), target: money("5000"), targetDate: null, today });
    expect(r.reached).toBe(false);
    expect(r.needPerMonth).toBeNull();
    expect(r.label).toContain("$3,000.00 to go");
  });

  it("computes a monthly pace toward a future target date", () => {
    const r = goalOnTrack({
      saved: money("2000"),
      target: money("5000"),
      targetDate: calendarDate("2027-01-20"), // ~6 months out
      today,
    });
    expect(r.monthsLeft).toBe(6);
    expect(r.label).toContain("$500.00/mo");
  });

  it("flags a target date that has already passed", () => {
    const r = goalOnTrack({
      saved: money("2000"),
      target: money("5000"),
      targetDate: calendarDate("2026-06-01"),
      today,
    });
    expect(r.monthsLeft).toBe(0);
    expect(r.label).toContain("short of the target date");
  });
});
