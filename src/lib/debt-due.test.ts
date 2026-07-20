import { describe, it, expect } from "vitest";
import { nextDebtDueDate } from "@/lib/debt-due";
import { calendarDate } from "@/lib/calendar-date";

describe("nextDebtDueDate", () => {
  it("returns this month's due day when it hasn't passed (today counts)", () => {
    expect(nextDebtDueDate(20, calendarDate("2026-07-15"))).toBe("2026-07-20");
    expect(nextDebtDueDate(15, calendarDate("2026-07-15"))).toBe("2026-07-15"); // due today
  });

  it("rolls to next month once the day has passed, including a year rollover", () => {
    expect(nextDebtDueDate(10, calendarDate("2026-07-15"))).toBe("2026-08-10");
    expect(nextDebtDueDate(5, calendarDate("2026-12-20"))).toBe("2027-01-05");
  });

  it("clamps due day 29-31 to the month's last day", () => {
    expect(nextDebtDueDate(31, calendarDate("2026-09-01"))).toBe("2026-09-30"); // 30-day month
    expect(nextDebtDueDate(31, calendarDate("2026-02-01"))).toBe("2026-02-28"); // non-leap Feb
    // After Feb's clamped date passes, March gets the real 31st.
    expect(nextDebtDueDate(31, calendarDate("2026-03-01"))).toBe("2026-03-31");
  });
});
