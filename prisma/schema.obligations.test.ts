import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calendarDate, toUtcDate, fromDbDate } from "@/lib/calendar-date";

const cleanup = {
  scheduleIds: [] as string[],
  billIds: [] as string[],
  transferIds: [] as string[],
  debtIds: [] as string[],
  goalIds: [] as string[],
  auditIds: [] as string[],
};

afterAll(async () => {
  await prisma.bill.deleteMany({ where: { id: { in: cleanup.billIds } } });
  await prisma.recurringSchedule.deleteMany({ where: { id: { in: cleanup.scheduleIds } } });
  await prisma.workspaceTransfer.deleteMany({ where: { id: { in: cleanup.transferIds } } });
  await prisma.debt.deleteMany({ where: { id: { in: cleanup.debtIds } } });
  await prisma.goal.deleteMany({ where: { id: { in: cleanup.goalIds } } });
  await prisma.auditLog.deleteMany({ where: { id: { in: cleanup.auditIds } } });
  await prisma.$disconnect();
});

describe("obligations, planning & cross-workspace schema", () => {
  it("creates a recurring schedule, a linked bill, and a cross-workspace transfer", async () => {
    const workspaceId = randomUUID();
    const organizationId = randomUUID();

    const schedule = await prisma.recurringSchedule.create({
      data: {
        workspaceId,
        frequency: "monthly",
        interval: 1,
        dayOfMonth: 1,
        startDate: toUtcDate(calendarDate("2026-06-01")),
        nextRunDate: toUtcDate(calendarDate("2026-07-01")),
        templateVendor: "Rent",
        templateAmount: "1500.00",
      },
    });
    cleanup.scheduleIds.push(schedule.id);

    const bill = await prisma.bill.create({
      data: {
        workspaceId,
        vendor: "Rent",
        amount: "1500.00",
        dueDate: toUtcDate(calendarDate("2026-07-01")),
        status: "unpaid",
        type: "bill",
        recurringScheduleId: schedule.id,
      },
    });
    cleanup.billIds.push(bill.id);

    const transfer = await prisma.workspaceTransfer.create({
      data: {
        organizationId,
        fromWorkspaceId: randomUUID(),
        toWorkspaceId: workspaceId,
        type: "owner_draw",
        amount: "500.00",
        date: toUtcDate(calendarDate("2026-06-20")),
      },
    });
    cleanup.transferIds.push(transfer.id);

    expect(bill.amount.toFixed(2)).toBe("1500.00");
    expect(fromDbDate(bill.dueDate)).toBe("2026-07-01");
    expect(transfer.type).toBe("owner_draw");

    const readSchedule = await prisma.recurringSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
      include: { bills: true },
    });
    expect(readSchedule.bills).toHaveLength(1);
  });

  it("creates planning + audit records", async () => {
    const workspaceId = randomUUID();
    const organizationId = randomUUID();

    const debt = await prisma.debt.create({
      data: {
        workspaceId,
        name: "Card",
        type: "credit_card",
        currentBalance: "2500.00",
        apr: "19.99",
        minimumPayment: "75.00",
        dueDay: 15,
      },
    });
    cleanup.debtIds.push(debt.id);

    const goal = await prisma.goal.create({
      data: { workspaceId, name: "Vacation", targetAmount: "5000.00", currentSaved: "1200.00", status: "active" },
    });
    cleanup.goalIds.push(goal.id);

    const audit = await prisma.auditLog.create({
      data: {
        organizationId,
        workspaceId,
        userId: randomUUID(),
        action: "create",
        entityType: "Goal",
        entityId: goal.id,
        after: { name: "Vacation" },
      },
    });
    cleanup.auditIds.push(audit.id);

    expect(debt.apr.toString()).toBe("19.99");
    expect(goal.targetAmount.toFixed(2)).toBe("5000.00");
    expect(audit.action).toBe("create");
  });
});
