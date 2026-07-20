import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  createRecurringBill,
  listRecurringSchedules,
  cancelRecurringSchedule,
} from "@/services/recurring-service";
import { ForbiddenError } from "@/services/authz";
import { addDays, today as todayFn, toUtcDate, calendarDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Recur Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#444444" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("recurring schedule CRUD", () => {
  it("creates a schedule, materializes upcoming bills immediately, lists it, and cancel removes future unpaid bills", async () => {
    // First due a few days out (relative to the real clock the service uses).
    const firstDue = addDays(todayFn(), 3);
    const schedule = await createRecurringBill(admin, workspaceId, {
      vendor: "Rent",
      amount: "1500.00",
      firstDueDate: firstDue,
      frequency: "monthly",
    });

    // Bills materialized inside the 90-day horizon, tied to this schedule.
    const bills = await prismaAdmin.bill.findMany({ where: { recurringScheduleId: schedule.id } });
    expect(bills.length).toBeGreaterThanOrEqual(3);
    expect(bills.every((b) => b.vendor === "Rent" && b.amount.toFixed(2) === "1500.00")).toBe(true);

    // Listed as a human view.
    const views = await listRecurringSchedules(admin, workspaceId);
    const view = views.find((v) => v.id === schedule.id)!;
    expect(view.vendor).toBe("Rent");
    expect(view.frequencyLabel).toBe("repeats monthly");
    expect(view.nextDueDate).toBe(firstDue);

    // Mark the first bill paid — cancel must NOT remove it (history stays).
    const first = bills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]!;
    await prismaAdmin.bill.update({ where: { id: first.id }, data: { status: "paid" } });

    const result = await cancelRecurringSchedule(admin, schedule.id);
    expect(result.removedFutureBills).toBe(bills.length - 1);

    const remaining = await prismaAdmin.bill.findMany({ where: { id: { in: bills.map((b) => b.id) } } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(first.id);
    expect(remaining[0]!.recurringScheduleId).toBeNull(); // detached, not deleted
    expect(await prismaAdmin.recurringSchedule.findUnique({ where: { id: schedule.id } })).toBeNull();
  });

  it("denies a non-member create and a non-member cancel", async () => {
    await expect(
      createRecurringBill(stranger, workspaceId, {
        vendor: "X",
        amount: "10.00",
        firstDueDate: addDays(todayFn(), 5),
        frequency: "monthly",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const s = await prismaAdmin.recurringSchedule.create({
      data: { workspaceId, frequency: "monthly", startDate: toUtcDate(calendarDate("2026-08-01")), nextRunDate: toUtcDate(calendarDate("2026-08-01")), templateVendor: "Guarded", templateAmount: "5.00" },
    });
    await expect(cancelRecurringSchedule(stranger, s.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
