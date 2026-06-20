import { describe, it, expect } from "vitest";
import { money, add, sub, mul, sum, format, toCents, isNegative, compare } from "@/lib/money";

describe("money", () => {
  it("adds without float error", () => {
    expect(format(add(money("0.10"), money("0.20")))).toBe("$0.30");
  });

  it("subtracts exactly", () => {
    expect(format(sub(money("10.00"), money("0.01")))).toBe("$9.99");
  });

  it("rounds half-up to cents on format", () => {
    expect(format(money("2.345"))).toBe("$2.35");
    expect(format(money("2.344"))).toBe("$2.34");
  });

  it("rounds negatives half-up by magnitude", () => {
    expect(format(money("-2.345"))).toBe("-$2.35");
  });

  it("multiplies by a scalar then rounds half-up", () => {
    expect(format(mul(money("1.005"), 3))).toBe("$3.02");
  });

  it("sums an empty list to zero", () => {
    expect(format(sum([]))).toBe("$0.00");
  });

  it("keeps large sums exact (no float drift)", () => {
    const cents = Array.from({ length: 100 }, () => money("0.01"));
    expect(format(sum(cents))).toBe("$1.00");
    expect(format(sum([money("0.1"), money("0.2"), money("0.3")]))).toBe("$0.60");
  });

  it("formats thousands separators and negatives", () => {
    expect(format(money("1234.56"))).toBe("$1,234.56");
    expect(format(money("-3"))).toBe("-$3.00");
    expect(format(money("0"))).toBe("$0.00");
  });

  it("does not render a negative sign for values that round to zero", () => {
    expect(format(money("-0.001"))).toBe("$0.00");
  });

  it("converts to integer cents (bigint)", () => {
    expect(toCents(money("2.35"))).toBe(235n);
    expect(toCents(money("-3"))).toBe(-300n);
    expect(toCents(money("2.345"))).toBe(235n);
  });

  it("reports sign by rounded cents", () => {
    expect(isNegative(money("-0.01"))).toBe(true);
    expect(isNegative(money("0"))).toBe(false);
    expect(isNegative(money("-0.001"))).toBe(false);
  });

  it("compares by cents", () => {
    expect(compare(money("1.00"), money("2.00"))).toBe(-1);
    expect(compare(money("2.00"), money("1.00"))).toBe(1);
    expect(compare(money("1.00"), money("1.004"))).toBe(0);
  });
});
