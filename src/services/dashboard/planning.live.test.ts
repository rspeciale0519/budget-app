import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  listGoals,
  listDebts,
  createGoal,
  contributeToGoal,
  createDebt,
  recordDebtPayment,
} from "@/services/dashboard/planning";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate } from "@/lib/calendar-date";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
let savingsId: string;
let loanId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Planning Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "personal", color: "#222222" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  const savings = await prismaAdmin.account.create({ data: { workspaceId, name: "Vacation Fund", type: "savings", institution: "Ally", openingBalance: "1000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  savingsId = savings.id;
  const loan = await prismaAdmin.account.create({ data: { workspaceId, name: "Car Loan", type: "loan", institution: "Bank", openingBalance: "-5000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
  loanId = loan.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("planning-service goals", () => {
  it("contributes to an unlinked goal and marks it reached at the target", async () => {
    const goal = await createGoal(admin, workspaceId, { name: "New laptop", targetAmount: "500" });
    const r1 = await contributeToGoal(admin, goal.id, "300");
    expect(r1.reached).toBe(false);
    const r2 = await contributeToGoal(admin, goal.id, "300");
    expect(r2.reached).toBe(true);
    const reread = (await listGoals(admin, workspaceId)).find((g) => g.id === goal.id)!;
    expect(format(reread.saved)).toBe("$600.00");
    expect(reread.status).toBe("reached");
  });

  it("tracks a linked goal's saved amount from the account balance", async () => {
    const goal = await createGoal(admin, workspaceId, { name: "Vacation", targetAmount: "2000", accountId: savingsId });
    const view = (await listGoals(admin, workspaceId)).find((g) => g.id === goal.id)!;
    expect(view.linked).toBe(true);
    expect(format(view.saved)).toBe("$1,000.00"); // the savings account balance
    expect(view.pct).toBe(50);
  });

  it("refuses a manual contribution to an account-linked goal", async () => {
    const goal = await createGoal(admin, workspaceId, { name: "Linked", targetAmount: "100", accountId: savingsId });
    await expect(contributeToGoal(admin, goal.id, "10")).rejects.toThrow(/tracks an account/);
  });
});

describe("planning-service debts", () => {
  it("records a payment against an unlinked debt", async () => {
    const debt = await createDebt(admin, workspaceId, { name: "Store card", type: "credit_card", apr: "24.99", minimumPayment: "50", dueDay: 15, currentBalance: "1000" });
    await recordDebtPayment(admin, debt.id, "400");
    const view = (await listDebts(admin, workspaceId)).items.find((d) => d.id === debt.id)!;
    expect(format(view.balance)).toBe("$600.00");
    expect(view.apr).toBe("24.99%");
  });

  it("shows a linked debt's owed as the negation of the (negative) account balance", async () => {
    const debt = await createDebt(admin, workspaceId, { name: "Car", type: "loan", apr: "6.5", minimumPayment: "300", dueDay: 1, accountId: loanId });
    const view = (await listDebts(admin, workspaceId)).items.find((d) => d.id === debt.id)!;
    expect(view.linked).toBe(true);
    expect(format(view.balance)).toBe("$5,000.00"); // owed = -(-5000)
  });
});
