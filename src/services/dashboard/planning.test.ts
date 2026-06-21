import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listDebts, listGoals } from "@/services/dashboard/planning";
import { format } from "@/lib/money";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Plan Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#666666" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.debt.create({ data: { workspaceId, name: "Visa", type: "credit_card", currentBalance: "2480.00", apr: "19.99", minimumPayment: "75.00", dueDay: 15 } });
  await prismaAdmin.goal.create({ data: { workspaceId, name: "Vacation", targetAmount: "5000.00", currentSaved: "1200.00", status: "active" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("planning", () => {
  it("lists debts with apr% and a total", async () => {
    const { items, total } = await listDebts(admin, workspaceId);
    expect(items[0]?.name).toBe("Visa");
    expect(format(items[0]!.balance)).toBe("$2,480.00");
    expect(items[0]?.apr).toBe("19.99%");
    expect(format(total)).toBe("$2,480.00");
  });

  it("lists goals with capped pct", async () => {
    const goals = await listGoals(admin, workspaceId);
    expect(goals[0]?.name).toBe("Vacation");
    expect(goals[0]?.pct).toBe(24); // 1200 / 5000
  });
});
