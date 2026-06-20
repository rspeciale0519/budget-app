import Decimal from "decimal.js";

// All monetary math runs through decimal.js. Rounding is half-up to cents,
// applied at materialization (format/toCents). Raw JS float math is forbidden.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

declare const moneyBrand: unique symbol;

/** A branded Decimal. A plain number cannot be passed where Money is expected. */
export type Money = Decimal & { readonly [moneyBrand]: "Money" };

export type MoneyInput = string | number | Decimal;

export function money(value: MoneyInput): Money {
  return new Decimal(value) as Money;
}

export function add(a: Money, b: Money): Money {
  return a.plus(b) as Money;
}

export function sub(a: Money, b: Money): Money {
  return a.minus(b) as Money;
}

/** Multiply money by a scalar (e.g. quantity, rate). */
export function mul(m: Money, factor: MoneyInput): Money {
  return m.times(new Decimal(factor)) as Money;
}

export function sum(values: Money[]): Money {
  return values.reduce<Money>((acc, v) => add(acc, v), money(0));
}

function roundToCents(m: Money): Decimal {
  return m.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function toCents(m: Money): bigint {
  return BigInt(roundToCents(m).times(100).toFixed(0));
}

export function isNegative(m: Money): boolean {
  return toCents(m) < 0n;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  const diff = toCents(a) - toCents(b);
  return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}

export function format(m: Money): string {
  const rounded = roundToCents(m);
  const negative = rounded.isNegative() && !rounded.isZero();
  const parts = rounded.abs().toFixed(2).split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "00";
  const withSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${withSeparators}.${fraction}`;
}
