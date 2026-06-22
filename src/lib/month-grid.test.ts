import { describe, it, expect } from "vitest";
import { monthGrid } from "@/lib/month-grid";
import { addDays, compare } from "@/lib/calendar-date";

describe("monthGrid", () => {
  it("builds a 6x7 Sunday-start grid covering the month", () => {
    const grid = monthGrid(2026, 6); // June 2026; June 1 is a Monday
    expect(grid).toHaveLength(6);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid[0]![0]).toBe("2026-05-31"); // the Sunday before June 1
    expect(grid.flat()).toContain("2026-06-30");
  });

  it("emits consecutive days differing by exactly one", () => {
    const flat = monthGrid(2026, 6).flat();
    for (let i = 1; i < flat.length; i++) {
      expect(flat[i]).toBe(addDays(flat[i - 1]!, 1));
      expect(compare(flat[i]!, flat[i - 1]!)).toBe(1);
    }
  });
});
