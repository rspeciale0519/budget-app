import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { getDashboardData } from "@/services/dashboard/index";
import { workspaceMetrics } from "@/services/dashboard/metrics";
import { safeToSpend } from "@/services/dashboard/safe-to-spend";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";
import { mockDashboard } from "@/lib/mock/dashboard";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Agg Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#888888" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "5000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "Groceries", kind: "expense" } });
  await prismaAdmin.transaction.create({ data: { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-05")), amount: "-300.00", description: "g", source: "manual", dedupeHash: "agg1", categoryId: cat.id } });
  await prismaAdmin.bill.create({ data: { workspaceId, vendor: "Rent", amount: "1500.00", dueDate: toUtcDate(calendarDate("2026-06-25")), status: "unpaid", type: "bill" } });
  await prismaAdmin.debt.create({ data: { workspaceId, name: "Visa", type: "credit_card", currentBalance: "2480.00", apr: "19.99", minimumPayment: "75.00", dueDay: 15 } });
  await prismaAdmin.goal.create({ data: { workspaceId, name: "Vacation", targetAmount: "5000.00", currentSaved: "1200.00", status: "active" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("getDashboardData", () => {
  it("returns live figures matching the computation services (not the mock)", async () => {
    const data = await getDashboardData(admin, workspaceId, "month", today);
    const metrics = await workspaceMetrics(admin, workspaceId, "month", today);
    const sts = await safeToSpend(admin, workspaceId, today);

    expect(data.kpis.totalBalance).toBe(format(metrics.totalBalance));
    expect(data.kpis.totalBalance).not.toBe(mockDashboard.kpis.totalBalance);
    expect(data.kpis.safeToSpend).toBe(format(sts.result));
    expect(data.forecast.length).toBeGreaterThan(0);
    expect(data.categories[0]?.name).toBe("Groceries");
    expect(data.debts[0]?.name).toBe("Visa");
    expect(data.goals[0]?.pct).toBe(24);
  });

  it("assigns a stable category color across calls", async () => {
    const a = await getDashboardData(admin, workspaceId, "month", today);
    const b = await getDashboardData(admin, workspaceId, "month", today);
    expect(a.categories[0]?.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(a.categories[0]?.color).toBe(b.categories[0]?.color);
  });
});
