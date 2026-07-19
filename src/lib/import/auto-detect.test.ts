import { describe, it, expect } from "vitest";
import {
  guessColumns,
  guessDateFormat,
  guessSignRule,
  analyzeDateFormat,
  suggestsCreditCardInvert,
} from "./auto-detect";

describe("guessColumns", () => {
  it("maps a typical single-amount bank export", () => {
    const m = guessColumns(["Date", "Description", "Amount", "Balance"]);
    expect(m).toEqual({
      date: "Date",
      description: "Description",
      amount: "Amount",
      runningBalance: "Balance",
    });
  });

  it("maps separate debit/credit columns and drops amount noise", () => {
    const m = guessColumns(["Posting Date", "Details", "Debit", "Credit", "Running Balance"]);
    expect(m.date).toBe("Posting Date");
    expect(m.description).toBe("Details");
    expect(m.debit).toBe("Debit");
    expect(m.credit).toBe("Credit");
    expect(m.runningBalance).toBe("Running Balance");
    expect(m.amount).toBeUndefined();
  });

  it("is case-insensitive and recognizes memo/payee", () => {
    const m = guessColumns(["TRANS DATE", "MEMO", "PAYEE", "AMT"]);
    expect(m.date).toBe("TRANS DATE");
    expect(m.description).toBe("MEMO");
    expect(m.merchant).toBe("PAYEE");
    expect(m.amount).toBe("AMT");
  });

  it("prefers the real Description over Chase's Details (DEBIT/CREDIT) column", () => {
    const m = guessColumns([
      "Details",
      "Posting Date",
      "Description",
      "Amount",
      "Type",
      "Balance",
      "Check or Slip #",
    ]);
    expect(m.date).toBe("Posting Date");
    expect(m.description).toBe("Description");
    expect(m.amount).toBe("Amount");
    expect(m.runningBalance).toBe("Balance");
  });

  it("returns empty mapping when nothing matches", () => {
    expect(guessColumns(["foo", "bar"])).toEqual({});
  });
});

describe("guessDateFormat", () => {
  it("detects ISO", () => {
    expect(guessDateFormat(["2026-06-19", "2026-06-20"])).toBe("YYYY-MM-DD");
  });
  it("detects DD/MM when first part exceeds 12", () => {
    expect(guessDateFormat(["19/06/2026"])).toBe("DD/MM/YYYY");
  });
  it("detects MM/DD when second part exceeds 12", () => {
    expect(guessDateFormat(["06/19/2026"])).toBe("MM/DD/YYYY");
  });
  it("defaults to MM/DD/YYYY when ambiguous", () => {
    expect(guessDateFormat(["01/02/2026", ""])).toBe("MM/DD/YYYY");
  });
});

describe("guessSignRule", () => {
  it("uses separate_debit_credit when both present", () => {
    expect(guessSignRule({ debit: "Debit", credit: "Credit" })).toBe("separate_debit_credit");
  });
  it("defaults to single_signed", () => {
    expect(guessSignRule({ amount: "Amount" })).toBe("single_signed");
  });
});

describe("analyzeDateFormat", () => {
  it("flags genuinely ambiguous slash dates (both halves ≤ 12)", () => {
    expect(analyzeDateFormat(["03/04/2026", "01/02/2026"])).toEqual({
      format: "MM/DD/YYYY",
      ambiguous: true,
    });
  });
  it("is not ambiguous when a day value exceeds 12", () => {
    expect(analyzeDateFormat(["19/06/2026"])).toEqual({ format: "DD/MM/YYYY", ambiguous: false });
    expect(analyzeDateFormat(["06/19/2026"])).toEqual({ format: "MM/DD/YYYY", ambiguous: false });
  });
  it("is not ambiguous for ISO, nor when there are no samples", () => {
    expect(analyzeDateFormat(["2026-06-19"])).toEqual({ format: "YYYY-MM-DD", ambiguous: false });
    expect(analyzeDateFormat(["", ""])).toEqual({ format: "MM/DD/YYYY", ambiguous: false });
  });
});

describe("suggestsCreditCardInvert", () => {
  it("suggests invert for a credit-card account whose amounts are mostly positive", () => {
    // 9 charges + 1 refund = 90% positive, at the threshold.
    expect(
      suggestsCreditCardInvert("credit_card", { amount: "Amount" }, [
        "45.00", "12.40", "8.00", "99.10", "4.50", "7.00", "3.00", "1.00", "2.00", "-5.00",
      ]),
    ).toBe(true);
  });
  it("does not suggest invert for a checking account", () => {
    expect(
      suggestsCreditCardInvert("checking", { amount: "Amount" }, ["12.40", "8.00", "99.10"]),
    ).toBe(false);
  });
  it("does not suggest invert when debit/credit columns make the sign explicit", () => {
    expect(
      suggestsCreditCardInvert("credit_card", { debit: "Debit", credit: "Credit" }, ["12.40", "8.00"]),
    ).toBe(false);
  });
  it("does not suggest invert when amounts are already mixed-sign", () => {
    expect(
      suggestsCreditCardInvert("credit_card", { amount: "Amount" }, ["-12.40", "8.00", "-99.10", "5.00"]),
    ).toBe(false);
  });
});
