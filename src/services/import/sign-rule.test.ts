import { describe, it, expect } from "vitest";
import { applySignRule } from "@/services/import/sign-rule";
import { format } from "@/lib/money";

describe("applySignRule", () => {
  it("single_signed keeps the sign", () => {
    expect(format(applySignRule("single_signed", { amount: "-25.50" }))).toBe("-$25.50");
    expect(format(applySignRule("single_signed", { amount: "10.00" }))).toBe("$10.00");
  });

  it("separate_debit_credit maps debit->negative, credit->positive", () => {
    expect(format(applySignRule("separate_debit_credit", { debit: "25.50", credit: "" }))).toBe("-$25.50");
    expect(format(applySignRule("separate_debit_credit", { debit: "", credit: "10.00" }))).toBe("$10.00");
  });

  it("invert flips the sign (credit-card export: charges are positive)", () => {
    expect(format(applySignRule("invert", { amount: "25.50" }))).toBe("-$25.50");
    expect(format(applySignRule("invert", { amount: "-100.00" }))).toBe("$100.00");
  });

  it("strips currency symbols and thousands separators", () => {
    expect(format(applySignRule("single_signed", { amount: "$1,234.56" }))).toBe("$1,234.56");
  });
});
