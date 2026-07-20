import { describe, it, expect } from "vitest";
import { matchRules, suggestRulePattern } from "./category-rule-service";

const rules = [
  { match: "equals", pattern: "Payroll", categoryId: "cat-income" },
  { match: "contains", pattern: "uber", categoryId: "cat-transport" },
  { match: "contains", pattern: "whole foods", categoryId: "cat-groceries" },
];

describe("matchRules", () => {
  it("returns the first contains-match (priority order preserved)", () => {
    expect(matchRules(rules, { description: "UBER *EATS 8829" })).toBe("cat-transport");
  });

  it("matches case-insensitively on description and merchant", () => {
    expect(matchRules(rules, { description: "card purchase", merchant: "Whole Foods Market" })).toBe(
      "cat-groceries",
    );
  });

  it("honors equals as a full-string match, not a substring", () => {
    expect(matchRules(rules, { description: "Payroll" })).toBe("cat-income");
    expect(matchRules(rules, { description: "Payroll deposit" })).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(matchRules(rules, { description: "Shell Gas" })).toBeNull();
  });

  it("returns null for an empty rule set", () => {
    expect(matchRules([], { description: "anything" })).toBeNull();
  });
});

describe("suggestRulePattern", () => {
  it("strips the volatile parts of a noisy bank line, keeping the merchant", () => {
    const p = suggestRulePattern("POS DEBIT 4732 STARBUCKS #10894 SEATTLE WA 06/14");
    expect(p).toContain("STARBUCKS");
    expect(p).not.toMatch(/4732|10894|06\/14/);
    expect(p.toUpperCase()).not.toMatch(/^POS/);
  });

  it("leaves an already-clean merchant name alone", () => {
    expect(suggestRulePattern("NETFLIX.COM")).toBe("NETFLIX.COM");
  });

  it("never returns empty — falls back to the original", () => {
    expect(suggestRulePattern("123456")).toBe("123456");
  });
});
