import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { safeToSpend } from "@/services/dashboard/safe-to-spend";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let wsIncome: string;
let wsNoIncome: string;

async function makeWorkspace(name: string): Promise<string> {
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name, type: "business", color: "#222222" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws.id, userId: admin, role: "admin" } });
  await prismaAdmin.account.create({
    data: { workspaceId: ws.id, name: "Chk", type: "checking", institution: "Bank", openingBalance: "5000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
  });
  await prismaAdmin.bill.createMany({
    data: [
      { workspaceId: ws.id, vendor: "Rent", amount: "1500.00", dueDate: toUtcDate(calendarDate("2026-06-25")), status: "unpaid", type: "bill" },
      { workspaceId: ws.id, vendor: "Card", amount: "400.00", dueDate: toUtcDate(calendarDate("2026-07-10")), status: "unpaid", type: "bill" },
    ],
  });
  return ws.id;
}

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "STS Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  wsIncome = await makeWorkspace("With Income");
  wsNoIncome = await makeWorkspace("No Income");
  await prismaAdmin.incomeSource.create({
    data: { workspaceId: wsIncome, name: "Salary", amount: "4000.00", frequency: "monthly", nextDate: toUtcDate(calendarDate("2026-06-30")) },
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("safeToSpend", () => {
  it("with income: horizon = next income date; only bills due before it subtract", async () => {
    const s = await safeToSpend(admin, wsIncome, calendarDate("2026-06-20"));
    expect(s.horizonDate).toBe("2026-06-30");
    expect(s.incomeConfigured).toBe(true);
    expect(s.unpaidBeforeHorizon.map((b) => b.vendor)).toEqual(["Rent"]);
    expect(format(s.result)).toBe("$3,500.00"); // 5000 - 1500
  });

  it("no income: 30-day horizon; degrades gracefully", async () => {
    const s = await safeToSpend(admin, wsNoIncome, calendarDate("2026-06-20"));
    expect(s.horizonDate).toBe("2026-07-20");
    expect(s.incomeConfigured).toBe(false);
    expect(s.unpaidBeforeHorizon.map((b) => b.vendor).sort()).toEqual(["Card", "Rent"]);
    expect(format(s.result)).toBe("$3,100.00"); // 5000 - 1900
  });
});
