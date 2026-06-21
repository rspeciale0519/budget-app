import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { createIncomeSource } from "@/services/income-source-service";
import { safeToSpend } from "@/services/dashboard/safe-to-spend";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
const today = calendarDate("2026-06-20");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Income Config Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#aaaaaa" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "5000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  await prismaAdmin.bill.createMany({
    data: [
      { workspaceId, vendor: "Rent", amount: "1500.00", dueDate: toUtcDate(calendarDate("2026-06-25")), status: "unpaid", type: "bill" },
      { workspaceId, vendor: "Card", amount: "400.00", dueDate: toUtcDate(calendarDate("2026-07-10")), status: "unpaid", type: "bill" },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("configuring expected income changes safe-to-spend", () => {
  it("no income → 30-day window; adding income → horizon shifts to the income date", async () => {
    const before = await safeToSpend(admin, workspaceId, today);
    expect(before.incomeConfigured).toBe(false);
    expect(before.horizonDate).toBe("2026-07-20");
    expect(format(before.result)).toBe("$3,100.00"); // 5000 - 1900

    await createIncomeSource(admin, workspaceId, {
      name: "Salary",
      amount: "4000.00",
      frequency: "monthly",
      nextDate: "2026-06-30",
    });

    const after = await safeToSpend(admin, workspaceId, today);
    expect(after.incomeConfigured).toBe(true);
    expect(after.horizonDate).toBe("2026-06-30");
    expect(format(after.result)).toBe("$3,500.00"); // 5000 - 1500 (Card now after income)
  });
});
