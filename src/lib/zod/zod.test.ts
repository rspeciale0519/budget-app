import { describe, it, expect } from "vitest";
import { zMoney, zCalendarDate } from "@/lib/zod/money";
import {
  createWorkspaceSchema,
  createTransactionSchema,
  markBillPaidSchema,
  tagOwnerDrawSchema,
} from "@/lib/zod/entities";
import { format } from "@/lib/money";

describe("zod primitives", () => {
  it("zMoney rejects >2dp and non-numeric, accepts valid", () => {
    expect(zMoney.safeParse("1.234").success).toBe(false);
    expect(zMoney.safeParse("abc").success).toBe(false);
    expect(zMoney.safeParse(10).success).toBe(false); // number, not string
    const ok = zMoney.parse("10.00");
    expect(format(ok)).toBe("$10.00");
  });

  it("zCalendarDate rejects impossible dates and accepts real ones", () => {
    expect(zCalendarDate.safeParse("2026-13-40").success).toBe(false);
    expect(zCalendarDate.safeParse("2026-02-30").success).toBe(false);
    expect(zCalendarDate.parse("2026-06-20")).toBe("2026-06-20");
  });
});

describe("entity schemas", () => {
  it("createWorkspaceSchema requires name, type, color", () => {
    expect(createWorkspaceSchema.safeParse({ name: "P", type: "personal", color: "#3b82f6" }).success).toBe(true);
    expect(createWorkspaceSchema.safeParse({ name: "P", type: "personal", color: "blue" }).success).toBe(false);
    expect(createWorkspaceSchema.safeParse({ type: "personal", color: "#3b82f6" }).success).toBe(false);
  });

  it("createTransactionSchema coerces amount + date", () => {
    const parsed = createTransactionSchema.parse({
      accountId: "a1",
      date: "2026-06-20",
      amount: "-25.50",
      description: "Coffee",
    });
    expect(format(parsed.amount)).toBe("-$25.50");
    expect(parsed.date).toBe("2026-06-20");
    expect(parsed.isTransfer).toBe(false);
  });

  it("markBillPaidSchema requires exactly one of transactionId / payFromAccountId", () => {
    expect(markBillPaidSchema.safeParse({ transactionId: "t1" }).success).toBe(true);
    expect(markBillPaidSchema.safeParse({ payFromAccountId: "a1" }).success).toBe(true);
    expect(markBillPaidSchema.safeParse({}).success).toBe(false);
    expect(markBillPaidSchema.safeParse({ transactionId: "t1", payFromAccountId: "a1" }).success).toBe(false);
  });

  it("tagOwnerDrawSchema enforces distinct workspaces and a source", () => {
    expect(
      tagOwnerDrawSchema.safeParse({ fromWorkspaceId: "w1", toWorkspaceId: "w1", fromTransactionId: "t1" }).success,
    ).toBe(false);
    expect(
      tagOwnerDrawSchema.safeParse({ fromWorkspaceId: "w1", toWorkspaceId: "w2" }).success,
    ).toBe(false);
    expect(
      tagOwnerDrawSchema.safeParse({
        fromWorkspaceId: "w1",
        toWorkspaceId: "w2",
        amount: "500.00",
        date: "2026-06-20",
      }).success,
    ).toBe(true);
  });
});
