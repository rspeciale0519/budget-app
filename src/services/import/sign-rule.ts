import { money, mul, type Money } from "@/lib/money";
import type { SignRule } from "@prisma/client";

export interface AmountCells {
  amount?: string;
  debit?: string;
  credit?: string;
}

function toMoneyOrZero(value: string | undefined): Money {
  const cleaned = (value ?? "").trim().replace(/[$,]/g, "");
  if (cleaned === "") return money(0);
  return money(cleaned);
}

/**
 * Convert a bank row's amount columns into a signed Money. The sign rule makes
 * imports bank-agnostic — notably so a credit-card export's positive charges
 * are booked as expenses (negative), not income.
 */
export function applySignRule(rule: SignRule, cells: AmountCells): Money {
  switch (rule) {
    case "single_signed":
      return toMoneyOrZero(cells.amount);
    case "invert":
      return mul(toMoneyOrZero(cells.amount), "-1");
    case "separate_debit_credit": {
      const debit = toMoneyOrZero(cells.debit);
      const credit = toMoneyOrZero(cells.credit);
      return debit.isZero() ? credit : mul(debit, "-1");
    }
  }
}
