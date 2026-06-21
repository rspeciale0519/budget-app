import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { workspaceMetrics } from "@/services/dashboard/metrics";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Metrics Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#111111" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({
    data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "1000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
  });
  await prismaAdmin.transaction.createMany({
    data: [
      { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-10")), amount: "500.00", description: "income", source: "manual", dedupeHash: "m1" },
      { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-11")), amount: "-200.00", description: "expense", source: "manual", dedupeHash: "m2" },
      { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-06-12")), amount: "-100.00", description: "transfer", source: "manual", dedupeHash: "m3", isTransfer: true },
      { workspaceId, accountId: acc.id, date: toUtcDate(calendarDate("2026-07-10")), amount: "999.00", description: "out of period", source: "manual", dedupeHash: "m4" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("workspaceMetrics", () => {
  it("computes balance (all tx incl transfers) and period in/out (transfers excluded)", async () => {
    const m = await workspaceMetrics(admin, workspaceId, "month", calendarDate("2026-06-20"));
    expect(format(m.totalBalance)).toBe("$2,199.00"); // 1000 + 500 - 200 - 100 + 999
    expect(format(m.moneyIn)).toBe("$500.00"); // out-of-period +999 excluded
    expect(format(m.moneyOut)).toBe("$200.00"); // transfer -100 excluded
  });
});
