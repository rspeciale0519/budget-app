import { describe, it, expect } from "vitest";
import { scoreMatch } from "@/lib/match-score";
import { money } from "@/lib/money";
import { calendarDate } from "@/lib/calendar-date";

const base = {
  billVendor: "USPS Postage Account",
  billAmount: money("2150.00"),
  billDue: calendarDate("2026-07-03"),
};

describe("scoreMatch", () => {
  it("scores an exact amount + same-day + vendor-overlap candidate highly", () => {
    const s = scoreMatch({
      ...base,
      txnDescription: "USPS POSTAGE",
      txnMerchant: "USPS",
      txnAmount: money("-2150.00"),
      txnDate: calendarDate("2026-07-03"),
    });
    expect(s).not.toBeNull();
    expect(s!).toBeGreaterThan(0.8);
  });

  it("disqualifies an amount outside tolerance", () => {
    expect(
      scoreMatch({
        ...base,
        txnDescription: "USPS",
        txnMerchant: null,
        txnAmount: money("-2500.00"),
        txnDate: calendarDate("2026-07-03"),
      }),
    ).toBeNull();
  });

  it("disqualifies a date outside the ±5 day window", () => {
    expect(
      scoreMatch({
        ...base,
        txnDescription: "USPS POSTAGE",
        txnMerchant: "USPS",
        txnAmount: money("-2150.00"),
        txnDate: calendarDate("2026-07-12"),
      }),
    ).toBeNull();
  });

  it("ranks a closer amount above a vendor-only overlap", () => {
    const close = scoreMatch({
      ...base,
      txnDescription: "payment",
      txnMerchant: null,
      txnAmount: money("-2150.00"),
      txnDate: calendarDate("2026-07-04"),
    })!;
    const vendorOnly = scoreMatch({
      ...base,
      txnDescription: "USPS Postage",
      txnMerchant: "USPS",
      txnAmount: money("-2120.00"),
      txnDate: calendarDate("2026-07-04"),
    })!;
    expect(close).toBeGreaterThan(vendorOnly);
  });
});
