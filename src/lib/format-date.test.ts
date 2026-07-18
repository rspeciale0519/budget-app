import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/format-date";

describe("formatDate", () => {
  it("formats strings and Dates identically, in UTC", () => {
    expect(formatDate("2026-07-18")).toBe("Jul 18, 2026");
    expect(formatDate(new Date("2026-07-18T00:00:00Z"))).toBe("Jul 18, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});
