import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { categoryBreakdown } from "@/services/dashboard/category-breakdown";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Cat Bd Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#444444" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acc = await prismaAdmin.account.create({ data: { workspaceId, name: "Chk", type: "checking", institution: "Bank", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  const groceries = await prismaAdmin.category.create({ data: { workspaceId, name: "Groceries", kind: "expense" } });
  const dining = await prismaAdmin.category.create({ data: { workspaceId, name: "Dining", kind: "expense" } });
  const income = await prismaAdmin.category.create({ data: { workspaceId, name: "Salary", kind: "income" } });
  const d = (s: string) => toUtcDate(calendarDate(s));
  await prismaAdmin.transaction.createMany({
    data: [
      { workspaceId, accountId: acc.id, date: d("2026-06-05"), amount: "-300.00", description: "g1", source: "manual", dedupeHash: "c1", categoryId: groceries.id },
      { workspaceId, accountId: acc.id, date: d("2026-06-06"), amount: "-100.00", description: "g2", source: "manual", dedupeHash: "c2", categoryId: groceries.id },
      { workspaceId, accountId: acc.id, date: d("2026-06-07"), amount: "-100.00", description: "dn", source: "manual", dedupeHash: "c3", categoryId: dining.id },
      { workspaceId, accountId: acc.id, date: d("2026-06-08"), amount: "500.00", description: "inc", source: "manual", dedupeHash: "c4", categoryId: income.id },
      { workspaceId, accountId: acc.id, date: d("2026-06-09"), amount: "-50.00", description: "xfer", source: "manual", dedupeHash: "c5", isTransfer: true },
    ],
  });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("categoryBreakdown", () => {
  it("sums expenses by category (transfers + income excluded), sorted desc with pct + id", async () => {
    const rows = await categoryBreakdown(admin, workspaceId, "month", calendarDate("2026-06-20"));
    expect(rows.map((r) => ({ name: r.name, amount: format(r.amount), pct: r.pct }))).toEqual([
      { name: "Groceries", amount: "$400.00", pct: 80 },
      { name: "Dining", amount: "$100.00", pct: 20 },
    ]);
    expect(rows.every((r) => typeof r.categoryId === "string" && r.categoryId.length > 0)).toBe(true);
  });
});
