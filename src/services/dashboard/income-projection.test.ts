import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { projectIncome, nextIncomeEvent } from "@/services/dashboard/income-projection";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";
import { format } from "@/lib/money";

const createdIds: string[] = [];

afterAll(async () => {
  await prismaAdmin.incomeSource.deleteMany({ where: { id: { in: createdIds } } });
  await prismaAdmin.$disconnect();
});

describe("projectIncome / nextIncomeEvent", () => {
  it("steps a monthly source across a window and finds the next event", async () => {
    const workspaceId = randomUUID();
    const src = await prismaAdmin.incomeSource.create({
      data: {
        workspaceId,
        name: "Salary",
        amount: "4000.00",
        frequency: "monthly",
        nextDate: toUtcDate(calendarDate("2026-07-01")),
      },
    });
    createdIds.push(src.id);

    const events = await projectIncome(
      prismaAdmin,
      workspaceId,
      calendarDate("2026-06-21"),
      calendarDate("2026-09-15"),
    );
    expect(events.map((e) => e.date)).toEqual(["2026-07-01", "2026-08-01", "2026-09-01"]);
    expect(events.every((e) => format(e.amount) === "$4,000.00")).toBe(true);

    const next = nextIncomeEvent(events, calendarDate("2026-06-21"));
    expect(next?.date).toBe("2026-07-01");
  });

  it("returns no events and a null next event when no sources exist", async () => {
    const events = await projectIncome(
      prismaAdmin,
      randomUUID(),
      calendarDate("2026-06-21"),
      calendarDate("2026-12-31"),
    );
    expect(events).toEqual([]);
    expect(nextIncomeEvent(events, calendarDate("2026-06-21"))).toBeNull();
  });

  it("clamps month-end (Jan 31 monthly → Feb 28)", async () => {
    const workspaceId = randomUUID();
    const src = await prismaAdmin.incomeSource.create({
      data: {
        workspaceId,
        name: "EOM",
        amount: "100.00",
        frequency: "monthly",
        nextDate: toUtcDate(calendarDate("2026-01-31")),
      },
    });
    createdIds.push(src.id);
    const events = await projectIncome(
      prismaAdmin,
      workspaceId,
      calendarDate("2026-01-01"),
      calendarDate("2026-04-01"),
    );
    expect(events.map((e) => e.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-28"]);
  });
});
