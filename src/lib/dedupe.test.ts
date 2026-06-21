import { describe, it, expect } from "vitest";
import { dedupeHash } from "@/lib/dedupe";
import { money } from "@/lib/money";
import { calendarDate } from "@/lib/calendar-date";

const base = {
  accountId: "acc_1",
  date: calendarDate("2026-06-20"),
  amount: money("-12.34"),
  description: "Coffee Shop",
  runningBalance: money("100.00"),
};

describe("dedupeHash", () => {
  it("is stable for identical inputs", () => {
    expect(dedupeHash(base)).toBe(dedupeHash({ ...base }));
  });

  it("normalizes description whitespace and case", () => {
    expect(dedupeHash({ ...base, description: "  cOFFEE   shop " })).toBe(dedupeHash(base));
  });

  it("changes when any field changes", () => {
    const h = dedupeHash(base);
    expect(dedupeHash({ ...base, amount: money("-12.35") })).not.toBe(h);
    expect(dedupeHash({ ...base, description: "Tea Shop" })).not.toBe(h);
    expect(dedupeHash({ ...base, date: calendarDate("2026-06-21") })).not.toBe(h);
    expect(dedupeHash({ ...base, accountId: "acc_2" })).not.toBe(h);
    expect(dedupeHash({ ...base, runningBalance: money("99.99") })).not.toBe(h);
  });

  it("treats absent and null running balance the same, distinct from a value", () => {
    const withNull = dedupeHash({ ...base, runningBalance: null });
    const { runningBalance: _omit, ...noBalance } = base;
    void _omit;
    expect(dedupeHash(noBalance)).toBe(withNull);
    expect(withNull).not.toBe(dedupeHash(base));
  });

  it("returns a 64-char hex sha-256 digest", () => {
    expect(dedupeHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});
