import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { parsePeriod } from "@/services/dashboard/period";
import { getDashboardData } from "@/services/dashboard/index";
import { mockDashboard } from "@/lib/mock/dashboard";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Wire Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#999999" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "1234.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("dashboard page wiring", () => {
  it("parsePeriod accepts valid values and defaults to month", () => {
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod("year")).toBe("year");
    expect(parsePeriod(undefined)).toBe("month");
    expect(parsePeriod("bogus")).toBe("month");
  });

  it("the page data path yields live figures, not the mock", async () => {
    const data = await getDashboardData(admin, workspaceId, "month", calendarDate("2026-06-20"));
    expect(data.kpis.totalBalance).toBe("$1,234.00");
    expect(data.kpis.totalBalance).not.toBe(mockDashboard.kpis.totalBalance);
  });
});
