import { describe, it, expect } from "vitest";
import { guessColumns, guessDateFormat, guessSignRule } from "./auto-detect";

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
