import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { billCalendar } from "@/services/dashboard/bill-calendar";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
const today = calendarDate("2026-07-01");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Cal Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.bill.createMany({
    data: [
      { workspaceId, vendor: "Late Co", amount: "50.00", dueDate: toUtcDate(calendarDate("2026-06-30")), status: "unpaid", type: "bill" },
      { workspaceId, vendor: "Soon Co", amount: "75.00", dueDate: toUtcDate(calendarDate("2026-07-05")), status: "unpaid", type: "bill" },
      { workspaceId, vendor: "Later Co", amount: "90.00", dueDate: toUtcDate(calendarDate("2026-07-20")), status: "unpaid", type: "bill" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("billCalendar", () => {
  it("buckets bills onto a 6x7 grid with date-derived status", async () => {
    const m = await billCalendar(admin, workspaceId, 2026, 7, today);
    expect(m.weeks).toHaveLength(6);
    expect(m.weeks.every((w) => w.length === 7)).toBe(true);

    const days = m.weeks.flat();
    const find = (d: string) => days.find((x) => x.date === d)!;

    expect(find("2026-06-30").events[0]).toMatchObject({ vendor: "Late Co", status: "overdue" });
    expect(find("2026-07-05").events[0]).toMatchObject({ vendor: "Soon Co", status: "soon" });
    expect(find("2026-07-20").events[0]).toMatchObject({ vendor: "Later Co", status: "scheduled", amount: "$90.00" });

    expect(find("2026-07-01").isToday).toBe(true);
    expect(find("2026-06-30").inMonth).toBe(false);
    expect(find("2026-07-20").inMonth).toBe(true);
  });

  it("denies a non-member", async () => {
    await expect(billCalendar(stranger, workspaceId, 2026, 7, today)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
