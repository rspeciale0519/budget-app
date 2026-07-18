import { describe, it, expect } from "vitest";
import { parseYm, shiftMonth } from "@/lib/month-nav";

describe("month-nav", () => {
  it("rolls over December → January and back", () => {
    expect(shiftMonth(2026, 12, 1)).toBe("2027-01");
    expect(shiftMonth(2027, 1, -1)).toBe("2026-12");
    expect(shiftMonth(2026, 7, -7)).toBe("2025-12");
  });

  it("parses valid ym and falls back on garbage", () => {
    expect(parseYm("2026-03", "2026-07-18")).toEqual({ year: 2026, month: 3 });
    expect(parseYm("garbage", "2026-07-18")).toEqual({ year: 2026, month: 7 });
    expect(parseYm(undefined, "2026-07-18")).toEqual({ year: 2026, month: 7 });
    expect(parseYm("2026-13", "2026-07-18")).toEqual({ year: 2026, month: 7 });
  });
});
