import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { materializeRecurring } from "@/services/recurring-service";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const wsIdempotent = randomUUID();
const wsRace = randomUUID();
let scheduleId: string;
let raceScheduleId: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const s1 = await prismaAdmin.recurringSchedule.create({
    data: { workspaceId: wsIdempotent, frequency: "monthly", startDate: toUtcDate(today), nextRunDate: toUtcDate(today), templateVendor: "Rent", templateAmount: "1500.00" },
  });
  scheduleId = s1.id;
  const s2 = await prismaAdmin.recurringSchedule.create({
    data: { workspaceId: wsRace, frequency: "monthly", startDate: toUtcDate(today), nextRunDate: toUtcDate(today), templateVendor: "Rent", templateAmount: "1500.00" },
  });
  raceScheduleId = s2.id;
});

afterAll(async () => {
  await prismaAdmin.bill.deleteMany({ where: { recurringScheduleId: { in: [scheduleId, raceScheduleId] } } });
  await prismaAdmin.recurringSchedule.deleteMany({ where: { id: { in: [scheduleId, raceScheduleId] } } });
  await prismaAdmin.$disconnect();
});

describe("materializeRecurring", () => {
  it("materializes a horizon of bills, then is idempotent on re-run", async () => {
    const first = await materializeRecurring(wsIdempotent, today);
    const count1 = await prismaAdmin.bill.count({ where: { recurringScheduleId: scheduleId } });
    expect(first.created).toBe(count1);
    expect(count1).toBeGreaterThanOrEqual(3);
    const bills = await prismaAdmin.bill.findMany({ where: { recurringScheduleId: scheduleId } });
    expect(bills.every((b) => b.amount.toFixed(2) === "1500.00")).toBe(true);

    const second = await materializeRecurring(wsIdempotent, today);
    expect(second.created).toBe(0);
    expect(await prismaAdmin.bill.count({ where: { recurringScheduleId: scheduleId } })).toBe(count1);
  });

  it("is race-safe under concurrent calls (no duplicates)", async () => {
    await Promise.all([materializeRecurring(wsRace, today), materializeRecurring(wsRace, today)]);
    const dates = await prismaAdmin.bill.findMany({
      where: { recurringScheduleId: raceScheduleId },
      select: { dueDate: true },
    });
    const unique = new Set(dates.map((d) => d.dueDate.toISOString()));
    expect(dates.length).toBe(unique.size); // no duplicate (schedule, dueDate) rows
    expect(dates.length).toBeGreaterThanOrEqual(3);
  });
});
