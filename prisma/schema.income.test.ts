import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/prisma-admin";
import { calendarDate, toUtcDate, fromDbDate } from "@/lib/calendar-date";

const createdScheduleIds: string[] = [];
const createdIncomeIds: string[] = [];

afterAll(async () => {
  await prismaAdmin.bill.deleteMany({ where: { recurringScheduleId: { in: createdScheduleIds } } });
  await prismaAdmin.recurringSchedule.deleteMany({ where: { id: { in: createdScheduleIds } } });
  await prismaAdmin.incomeSource.deleteMany({ where: { id: { in: createdIncomeIds } } });
  await prismaAdmin.$disconnect();
});

describe("IncomeSource schema + bill recurrence constraint", () => {
  it("stores an IncomeSource with Decimal amount and calendar nextDate", async () => {
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
    createdIncomeIds.push(src.id);
    expect(Prisma.Decimal.isDecimal(src.amount)).toBe(true);
    expect(src.amount.toFixed(2)).toBe("4000.00");
    expect(fromDbDate(src.nextDate)).toBe("2026-07-01");
  });

  it("forbids two materialized bills with the same (recurringScheduleId, dueDate)", async () => {
    const workspaceId = randomUUID();
    const schedule = await prismaAdmin.recurringSchedule.create({
      data: {
        workspaceId,
        frequency: "monthly",
        startDate: toUtcDate(calendarDate("2026-06-01")),
        nextRunDate: toUtcDate(calendarDate("2026-07-01")),
        templateVendor: "Rent",
        templateAmount: "1500.00",
      },
    });
    createdScheduleIds.push(schedule.id);

    const due = toUtcDate(calendarDate("2026-07-01"));
    await prismaAdmin.bill.create({
      data: { workspaceId, vendor: "Rent", amount: "1500.00", dueDate: due, status: "unpaid", type: "bill", recurringScheduleId: schedule.id },
    });
    await expect(
      prismaAdmin.bill.create({
        data: { workspaceId, vendor: "Rent", amount: "1500.00", dueDate: due, status: "unpaid", type: "bill", recurringScheduleId: schedule.id },
      }),
    ).rejects.toThrow();
  });
});
