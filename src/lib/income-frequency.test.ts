import { describe, it, expect } from "vitest";
import { monthlyEquivalent, totalMonthlyIncome } from "@/lib/income-frequency";
import { money, format } from "@/lib/money";

describe("income-frequency", () => {
  it("converts each frequency to an approximate monthly amount", () => {
    expect(format(monthlyEquivalent(money("100.00"), "monthly"))).toBe("$100.00");
    expect(format(monthlyEquivalent(money("1200.00"), "annual"))).toBe("$100.00");
    expect(format(monthlyEquivalent(money("300.00"), "quarterly"))).toBe("$100.00");
    // Weekly: 100 * 52 / 12 ≈ 433.33
    expect(format(monthlyEquivalent(money("100.00"), "weekly"))).toBe("$433.33");
  });

  it("sums mixed-frequency sources into one monthly total", () => {
    const total = totalMonthlyIncome([
      { amount: money("1200.00"), frequency: "annual" }, // ≈ 100/mo
      { amount: money("300.00"), frequency: "quarterly" }, // ≈ 100/mo
      { amount: money("50.00"), frequency: "monthly" }, // 50/mo
    ]);
    expect(format(total)).toBe("$250.00");
  });

  it("treats an unknown frequency as monthly", () => {
    expect(format(monthlyEquivalent(money("75.00"), "whenever"))).toBe("$75.00");
  });
});
