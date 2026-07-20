import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { cashflowForecast } from "@/services/dashboard/forecast";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Forecast Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#333333" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.account.create({
    data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "2000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
  });
  await prismaAdmin.bill.create({
    data: { workspaceId, vendor: "Rent", amount: "1500.00", dueDate: toUtcDate(calendarDate("2026-06-23")), status: "unpaid", type: "bill" },
  });
  await prismaAdmin.incomeSource.create({
    data: { workspaceId, name: "Salary", amount: "1000.00", frequency: "monthly", nextDate: toUtcDate(calendarDate("2026-06-25")) },
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("cashflowForecast", () => {
  it("walks daily balance with bills out and projected income in, flags the low point", async () => {
    const f = await cashflowForecast(admin, workspaceId, calendarDate("2026-06-20"), 30);
    const at = (d: string) => f.points.find((p) => p.date === d);
    expect(format(at("2026-06-23")!.balance)).toBe("$500.00"); // 2000 - 1500
    expect(format(at("2026-06-25")!.balance)).toBe("$1,500.00"); // 500 + 1000
    expect(f.lowest.date).toBe("2026-06-23");
    expect(format(f.lowest.balance)).toBe("$500.00");
    expect(f.incomeConfigured).toBe(true);
    // Payday flag is set exactly on the income date, nowhere else.
    expect(at("2026-06-25")!.isPayday).toBe(true);
    expect(at("2026-06-23")!.isPayday).toBe(false);
    expect(f.points.filter((p) => p.isPayday).map((p) => p.date)).toEqual(["2026-06-25"]);
  });
});
