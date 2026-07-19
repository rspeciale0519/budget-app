import { mul, sum, type Money } from "@/lib/money";

// How many times a frequency occurs per month, as decimal-safe string factors.
// Weekly/quarterly/annual don't divide the month evenly, so these are estimates —
// always presented with "≈".
const MONTHLY_FACTOR: Record<string, string> = {
  weekly: "4.3333333333",
  biweekly: "2.1666666667",
  monthly: "1",
  quarterly: "0.3333333333",
  annual: "0.0833333333",
};

/** The approximate monthly value of a recurring amount at a given frequency. */
export function monthlyEquivalent(amount: Money, frequency: string): Money {
  return mul(amount, MONTHLY_FACTOR[frequency] ?? "1");
}

/** Approximate total monthly income across a set of sources. */
export function totalMonthlyIncome(sources: { amount: Money; frequency: string }[]): Money {
  return sum(sources.map((s) => monthlyEquivalent(s.amount, s.frequency)));
}
