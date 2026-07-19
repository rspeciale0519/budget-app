import { describe, it, expect } from "vitest";
import { formatAuditLine, auditObject } from "@/services/audit-format";

describe("audit-format", () => {
  it("names the affected thing from the after JSON when present", () => {
    expect(auditObject("Bill", { vendor: "Electric Co", status: "paid" })).toBe("Electric Co");
    expect(auditObject("Account", { name: "Everyday Checking" })).toBe("Everyday Checking");
  });

  it("falls back to a book-language noun, never the raw 'Workspace' model name", () => {
    expect(auditObject("Workspace", { status: "x" })).toBe("book");
    expect(auditObject("Bill", { status: "paid" })).toBe("bill");
  });

  it("builds a who-did-what line", () => {
    expect(formatAuditLine("Rob", { action: "mark_paid", entityType: "Bill", after: { vendor: "Rent" } })).toBe(
      "Rob marked paid Rent",
    );
    expect(formatAuditLine("You", { action: "create", entityType: "Account", after: {} })).toBe(
      "You added account",
    );
  });

  it("phrases an owner-draw as paying yourself, not 'owner draw recorded'", () => {
    const line = formatAuditLine("You", { action: "income_bridge", entityType: "Transfer", after: {} });
    expect(line).toBe("You paid themselves — moved money between books");
    expect(line.toLowerCase()).not.toContain("owner draw");
  });
});
