import { describe, it, expect } from "vitest";
import { payoffPlan, comparePlans } from "@/lib/payoff-plan";
import { money } from "@/lib/money";

const smallLowApr = { name: "Store card", balance: money("1000"), apr: money("5"), minimum: money("50") };
const bigHighApr = { name: "Visa", balance: money("5000"), apr: money("24"), minimum: money("150") };

describe("payoffPlan", () => {
  it("snowball finishes the smallest debt first; avalanche is never slower overall", () => {
    // Note: `order` is FINISH order, not targeting order — under avalanche the
    // small low-APR debt can still finish first from its own minimums while the
    // extra hammers the high-APR one. The observable avalanche win is interest
    // (asserted below) and never-later debt freedom.
    const snow = payoffPlan([smallLowApr, bigHighApr], 100, "snowball");
    const aval = payoffPlan([smallLowApr, bigHighApr], 100, "avalanche");
    expect(snow.order[0]).toBe("Store card");
    expect(aval.monthsToDebtFree).toBeLessThanOrEqual(snow.monthsToDebtFree);
    expect(snow.ok && aval.ok).toBe(true);
  });

  it("avalanche never pays more total interest than snowball", () => {
    const { snowball, avalanche, avalancheSaves } = comparePlans([smallLowApr, bigHighApr], 100);
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
    expect(avalancheSaves).toBe(snowball.totalInterest - avalanche.totalInterest);
  });

  it("handles 0% APR as pure division and zero extra", () => {
    const plan = payoffPlan(
      [{ name: "Loan", balance: money("1200"), apr: money("0"), minimum: money("100") }],
      0,
      "avalanche",
    );
    expect(plan.monthsToDebtFree).toBe(12);
    expect(plan.totalInterest).toBe(0);
  });

  it("reports the honest never-finishes case when minimums can't cover interest", () => {
    const plan = payoffPlan(
      [{ name: "Trap", balance: money("10000"), apr: money("30"), minimum: money("100") }],
      0,
      "snowball",
    );
    expect(plan.ok).toBe(false);
    expect(plan.monthsToDebtFree).toBe(Infinity);
    expect(plan.label).toContain("never finishes");
  });

  it("is already debt-free with no open balances", () => {
    const plan = payoffPlan([], 100, "snowball");
    expect(plan.monthsToDebtFree).toBe(0);
    expect(plan.label).toBe("Debt-free ✓");
  });
});
