import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  listGoals,
  listDebts,
  createGoal,
  contributeToGoal,
  allocateToGoal,
  createDebt,
  recordDebtPayment,
} from "@/services/dashboard/planning";
import { ForbiddenError } from "@/services/authz";
import { format } from "@/lib/money";
import { calendarDate, toUtcDate, addDays, today as todayFn } from "@/lib/calendar-date";

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

describe("envelope mode (DD2)", () => {
  it("1→2 transition keeps the first goal's displayed saved unchanged; single-link stays live", async () => {
    const acct = await prismaAdmin.account.create({ data: { workspaceId, name: "Shared Savings", type: "savings", institution: "X", openingBalance: "1000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
    const g1 = await createGoal(admin, workspaceId, { name: "Env First", targetAmount: "2000", accountId: acct.id });

    // Single link → live balance, no envelope.
    let v1 = (await listGoals(admin, workspaceId)).find((g) => g.id === g1.id)!;
    expect(v1.envelope).toBe(false);
    expect(format(v1.saved)).toBe("$1,000.00");

    // Second goal joins the account → envelope mode; the first goal's envelope
    // was seeded with the live balance, so its displayed saved must not change.
    const g2 = await createGoal(admin, workspaceId, { name: "Env Second", targetAmount: "500", accountId: acct.id });
    const views = await listGoals(admin, workspaceId);
    v1 = views.find((g) => g.id === g1.id)!;
    const v2 = views.find((g) => g.id === g2.id)!;
    expect(v1.envelope).toBe(true);
    expect(format(v1.saved)).toBe("$1,000.00"); // unchanged across the flip
    expect(format(v2.saved)).toBe("$0.00");
    expect(format(v1.unallocated!)).toBe("$0.00"); // first goal holds it all
  });

  it("allocates from the unallocated pool with a hard ceiling at the account balance", async () => {
    const acct = await prismaAdmin.account.create({ data: { workspaceId, name: "Pool Savings", type: "savings", institution: "X", openingBalance: "1000.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });
    // Seed two zero-envelope goals directly (bypassing the transition) so the
    // whole $1,000 starts unallocated — the plan's canonical scenario.
    const gA = await prismaAdmin.goal.create({ data: { workspaceId, name: "Pool A", targetAmount: "800.00", currentSaved: "0", accountId: acct.id } });
    const gB = await prismaAdmin.goal.create({ data: { workspaceId, name: "Pool B", targetAmount: "800.00", currentSaved: "0", accountId: acct.id } });

    await allocateToGoal(admin, gA.id, "600");
    await allocateToGoal(admin, gB.id, "300");
    const views = await listGoals(admin, workspaceId);
    const vA = views.find((g) => g.id === gA.id)!;
    const vB = views.find((g) => g.id === gB.id)!;
    expect(format(vA.saved)).toBe("$600.00");
    expect(format(vB.saved)).toBe("$300.00");
    expect(format(vA.unallocated!)).toBe("$100.00");

    await expect(allocateToGoal(admin, gA.id, "200")).rejects.toThrow(/Only \$100\.00 is unallocated/);
  });
});

describe("auto-contributions (DD3)", () => {
  it("materializes backdated contributions once per day via the system path", async () => {
    const today = todayFn();
    // A FRESH workspace: earlier tests already tripped the once-per-day guard for
    // the shared one, which would (correctly) skip materialization here.
    const ws2 = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Auto WS", type: "personal", color: "#777777" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws2.id, userId: admin, role: "admin" } });
    // Weekly $25 starting 40 days ago → 6 due occurrences (days -40,-33,-26,-19,-12,-5).
    await prismaAdmin.goal.create({
      data: {
        workspaceId: ws2.id,
        name: "Auto Fund",
        targetAmount: "5000.00",
        currentSaved: "0",
        contributionAmount: "25.00",
        contributionFrequency: "weekly",
        contributionNextDate: toUtcDate(addDays(today, -40)),
      },
    });
    const view = (await listGoals(admin, ws2.id)).find((g) => g.name === "Auto Fund")!;
    expect(format(view.saved)).toBe("$150.00");
    expect(view.autoAdd).toBe("auto-adds $25.00 weekly");

    // A second read the same day must not double-apply.
    const again = (await listGoals(admin, ws2.id)).find((g) => g.name === "Auto Fund")!;
    expect(format(again.saved)).toBe("$150.00");

    // The next date advanced past today.
    const row = await prismaAdmin.goal.findFirstOrThrow({ where: { workspaceId: ws2.id, name: "Auto Fund" } });
    expect(row.contributionNextDate!.getTime()).toBeGreaterThan(toUtcDate(today).getTime());
  });

  it("rejects auto-add on a linked goal", async () => {
    await expect(
      createGoal(admin, workspaceId, {
        name: "Linked auto",
        targetAmount: "100",
        accountId: savingsId,
        contributionAmount: "10",
        contributionFrequency: "monthly",
        contributionNextDate: todayFn(),
      }),
    ).rejects.toThrow(/manually-tracked/);
  });
});

describe("planning-service cross-workspace guard", () => {
  it("rejects linking a goal or debt to an account in a different book, even for a member of both", async () => {
    // A second book the same admin belongs to (so RLS would let them SEE the account).
    const ws2 = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Other book", type: "business", color: "#999999" } });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws2.id, userId: admin, role: "admin" } });
    const otherAcct = await prismaAdmin.account.create({ data: { workspaceId: ws2.id, name: "Other savings", type: "savings", institution: "X", openingBalance: "500.00", openingDate: toUtcDate(calendarDate("2026-01-01")) } });

    await expect(
      createGoal(admin, workspaceId, { name: "Cross", targetAmount: "100", accountId: otherAcct.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      createDebt(admin, workspaceId, { name: "Cross", type: "loan", apr: "5", minimumPayment: "50", dueDay: 1, accountId: otherAcct.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
