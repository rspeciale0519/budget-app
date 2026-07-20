import { describe, it, expect } from "vitest";
import { debtPayoff } from "@/lib/debt-payoff";
import { money } from "@/lib/money";

describe("debtPayoff", () => {
  it("reports paid off at a zero balance", () => {
    expect(debtPayoff({ balance: money("0"), apr: money("20"), minimumPayment: money("50") })).toEqual({
      months: 0,
      label: "Paid off ✓",
    });
  });

  it("flags a minimum that barely covers interest (never pays down)", () => {
    // 10000 @ 24% → ~$200/mo interest; a $150 minimum can't dent it.
    const r = debtPayoff({ balance: money("10000"), apr: money("24"), minimumPayment: money("150") });
    expect(r.months).toBe(Infinity);
    expect(r.label).toContain("barely covers interest");
  });

  it("handles 0% APR as simple division", () => {
    const r = debtPayoff({ balance: money("1000"), apr: money("0"), minimumPayment: money("100") });
    expect(r.months).toBe(10);
  });

  it("estimates a finite payoff for a normal card", () => {
    const r = debtPayoff({ balance: money("2000"), apr: money("19.99"), minimumPayment: money("100") });
    expect(r.months).toBeGreaterThan(12);
    expect(r.months).toBeLessThan(40);
    expect(r.label).toContain("at the minimum");
  });
});
