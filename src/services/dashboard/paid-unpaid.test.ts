import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { paidVsUnpaid } from "@/services/dashboard/paid-unpaid";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "PvU Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#555555" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const d = (s: string) => toUtcDate(calendarDate(s));
  await prismaAdmin.bill.createMany({
    data: [
      { workspaceId, vendor: "A", amount: "100.00", dueDate: d("2026-06-05"), status: "paid", type: "bill" },
      { workspaceId, vendor: "B", amount: "200.00", dueDate: d("2026-06-06"), status: "paid", type: "bill" },
      { workspaceId, vendor: "C", amount: "300.00", dueDate: d("2026-06-07"), status: "unpaid", type: "bill" },
      { workspaceId, vendor: "OOP", amount: "999.00", dueDate: d("2026-07-07"), status: "unpaid", type: "bill" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("paidVsUnpaid", () => {
  it("splits in-period bills by status", async () => {
    const r = await paidVsUnpaid(admin, workspaceId, "month", calendarDate("2026-06-20"));
    expect(format(r.paid)).toBe("$300.00");
    expect(format(r.unpaid)).toBe("$300.00"); // out-of-period 999 excluded
    expect(r.paidPct).toBe(50);
  });
});
