import type { Money } from "@/lib/money";

export type PayoffStrategy = "snowball" | "avalanche";

export interface PayoffDebtInput {
  name: string;
  balance: Money;
  apr: Money; // percent, e.g. 19.99
  minimum: Money;
}

export interface PayoffPlan {
  ok: boolean;
  /** Order debts get finished in (names). */
  order: string[];
  monthsToDebtFree: number;
  totalInterest: number; // dollars, advisory estimate
  label: string;
}

export interface PayoffComparison {
  snowball: PayoffPlan;
  avalanche: PayoffPlan;
  /** Interest saved by picking avalanche over snowball (≥ 0). */
  avalancheSaves: number;
}

const MAX_MONTHS = 1200; // 100 years — the honest "never" cutoff

/**
 * Month-by-month payoff simulation. Advisory: inputs are decimal-exact Money,
 * but the outputs are estimates (month counts + rounded interest), so plain
 * number math is appropriate — no exact dollar value is produced or stored.
 *
 * Rules: every debt gets its minimum each month; the extra (plus freed-up
 * minimums from finished debts) goes to the strategy's target — smallest
 * balance first (snowball) or highest APR first (avalanche).
 */
export function payoffPlan(
  debts: PayoffDebtInput[],
  extraPerMonth: number,
  strategy: PayoffStrategy,
): PayoffPlan {
  const live = debts
    .map((d) => ({
      name: d.name,
      balance: Number(d.balance.toFixed(2)),
      rate: Number(d.apr.toFixed(2)) / 100 / 12,
      minimum: Number(d.minimum.toFixed(2)),
    }))
    .filter((d) => d.balance > 0);
  if (live.length === 0) {
    return { ok: true, order: [], monthsToDebtFree: 0, totalInterest: 0, label: "Debt-free ✓" };
  }

  const order: string[] = [];
  let months = 0;
  let totalInterest = 0;

  const pickTarget = () => {
    const open = live.filter((d) => d.balance > 0);
    if (strategy === "snowball") open.sort((a, b) => a.balance - b.balance);
    else open.sort((a, b) => b.rate - a.rate);
    return open[0];
  };

  while (live.some((d) => d.balance > 0)) {
    months += 1;
    if (months > MAX_MONTHS) {
      return {
        ok: false,
        order,
        monthsToDebtFree: Infinity,
        totalInterest: Math.round(totalInterest),
        label: "The minimums don't cover the interest — this plan never finishes",
      };
    }

    // Interest accrues first.
    for (const d of live) {
      if (d.balance <= 0) continue;
      const interest = d.balance * d.rate;
      d.balance += interest;
      totalInterest += interest;
    }

    // Minimums to every open debt; freed minimums of finished debts join the extra.
    let pool = extraPerMonth;
    for (const d of live) {
      if (d.balance <= 0) {
        pool += d.minimum;
        continue;
      }
      const pay = Math.min(d.minimum, d.balance);
      d.balance -= pay;
    }

    // The pool hits the strategy target; overflow cascades to the next target.
    let target = pickTarget();
    while (pool > 0 && target) {
      const pay = Math.min(pool, target.balance);
      target.balance -= pay;
      pool -= pay;
      if (target.balance <= 0.005) target.balance = 0;
      target = target.balance === 0 ? pickTarget() : undefined;
    }

    for (const d of live) {
      if (d.balance === 0 && !order.includes(d.name)) order.push(d.name);
      if (d.balance > 0 && d.balance <= 0.005) d.balance = 0;
    }
  }

  for (const d of live) if (!order.includes(d.name)) order.push(d.name);

  return {
    ok: true,
    order,
    monthsToDebtFree: months,
    totalInterest: Math.round(totalInterest),
    label: `Debt-free in ~${months} ${months === 1 ? "month" : "months"}`,
  };
}

export function comparePlans(debts: PayoffDebtInput[], extraPerMonth: number): PayoffComparison {
  const snowball = payoffPlan(debts, extraPerMonth, "snowball");
  const avalanche = payoffPlan(debts, extraPerMonth, "avalanche");
  const avalancheSaves =
    snowball.ok && avalanche.ok ? Math.max(0, snowball.totalInterest - avalanche.totalInterest) : 0;
  return { snowball, avalanche, avalancheSaves };
}
