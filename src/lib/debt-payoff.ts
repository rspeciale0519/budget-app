import type { Money } from "@/lib/money";

export interface DebtPayoff {
  /** Whole months to reach a zero balance at the minimum; Infinity if it never will. */
  months: number;
  label: string;
}

/**
 * Estimate months-to-payoff at the minimum payment, given APR. Pure. The dollar
 * inputs are decimal-exact (Money); the month count is an advisory estimate from
 * the standard amortization formula, so ordinary float math is fine here — no
 * money value is produced, only an integer count.
 */
export function debtPayoff(input: { balance: Money; apr: Money; minimumPayment: Money }): DebtPayoff {
  const balance = Number(input.balance.toFixed(2));
  const aprPct = Number(input.apr.toFixed(2));
  const minimum = Number(input.minimumPayment.toFixed(2));

  if (balance <= 0) return { months: 0, label: "Paid off ✓" };

  const monthlyRate = aprPct / 100 / 12;
  const monthlyInterest = balance * monthlyRate;
  if (minimum <= monthlyInterest + 0.005) {
    return { months: Infinity, label: "The minimum barely covers interest — it won't pay down" };
  }

  const months =
    monthlyRate === 0
      ? Math.ceil(balance / minimum)
      : Math.ceil(-Math.log(1 - (monthlyRate * balance) / minimum) / Math.log(1 + monthlyRate));

  return { months, label: `~${months} ${months === 1 ? "month" : "months"} at the minimum` };
}
