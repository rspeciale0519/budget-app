import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { setBudget } from "@/services/budget-service";
import { budgetVsActual } from "@/services/dashboard/budget-vs-actual";
import { ForbiddenError } from "@/services/authz";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
let postageCat: string;
let saasCat: string;
let unbudgetedCat: string;
const today = calendarDate("2026-07-15");

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "BVA Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const acct = await prismaAdmin.account.create({
    data: { workspaceId, name: "Chk", type: "checking", institution: "B", openingBalance: "0.00", openingDate: toUtcDate(calendarDate("2026-01-01")) },
  });
  const mk = async (name: string) =>
    (await prismaAdmin.category.create({ data: { workspaceId, name, kind: "expense" } })).id;
  postageCat = await mk("Postage");
  saasCat = await mk("SaaS");
  unbudgetedCat = await mk("Misc");

  const tx = (categoryId: string, amount: string, h: string) => ({
    workspaceId, accountId: acct.id, categoryId, amount, description: "x",
    source: "manual" as const, dedupeHash: h, date: toUtcDate(calendarDate("2026-07-10")),
  });
  await prismaAdmin.transaction.createMany({
    data: [
      tx(postageCat, "-6100.00", "bva1"),
      tx(saasCat, "-5000.00", "bva2"),
      tx(unbudgetedCat, "-200.00", "bva3"),
    ],
  });

  await setBudget(admin, workspaceId, postageCat, "6500.00");
  await setBudget(admin, workspaceId, saasCat, "4000.00");
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("budgetVsActual", () => {
  it("joins budgets with monthly actuals, computes status, omits unbudgeted", async () => {
    const rows = await budgetVsActual(admin, workspaceId, today);
    expect(rows).toHaveLength(2); // Misc has no budget → omitted

    const saas = rows.find((r) => r.categoryId === saasCat)!;
    expect(saas).toMatchObject({ name: "SaaS", budget: "$4,000.00", actual: "$5,000.00", status: "over" });

    const postage = rows.find((r) => r.categoryId === postageCat)!;
    expect(postage).toMatchObject({ name: "Postage", actual: "$6,100.00" });
    expect(["under", "near"]).toContain(postage.status);

    // sorted by pct desc → the over row comes first
    expect(rows[0]!.categoryId).toBe(saasCat);
  });

  it("denies a non-member", async () => {
    await expect(budgetVsActual(stranger, workspaceId, today)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
