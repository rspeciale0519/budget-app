import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { paneSummary } from "@/services/dashboard/pane-summary";
import { workspaceMetrics } from "@/services/dashboard/metrics";
import { ForbiddenError } from "@/services/authz";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Pane Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "3000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  await prismaAdmin.bill.createMany({
    data: [
      { workspaceId, vendor: "Electric", amount: "120.00", dueDate: toUtcDate(calendarDate("2026-06-18")), status: "unpaid", type: "bill" },
      { workspaceId, vendor: "Internet", amount: "80.00", dueDate: toUtcDate(calendarDate("2026-06-24")), status: "unpaid", type: "bill" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("paneSummary", () => {
  it("returns name/color, formatted balance + safe-to-spend, and top bills (overdue first)", async () => {
    const s = await paneSummary(admin, workspaceId, today);
    const metrics = await workspaceMetrics(admin, workspaceId, "month", today);
    expect(s.name).toBe("Acme");
    expect(s.color).toBe("#10b981");
    expect(s.balance).toBe(format(metrics.totalBalance));
    expect(s.topBills[0]).toMatchObject({ vendor: "Electric", status: "overdue" });
    expect(s.topBills.some((b) => b.vendor === "Internet" && b.status === "soon")).toBe(true);
  });

  it("denies a non-member", async () => {
    await expect(paneSummary(stranger, workspaceId, today)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
