import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { setBudget, listBudgets, deleteBudget, moveBudget } from "@/services/budget-service";
import { ForbiddenError } from "@/services/authz";
import { money, compare } from "@/lib/money";

const admin = randomUUID();
const viewer = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;
let categoryId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Budget Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Acme", type: "business", color: "#10b981" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: viewer, role: "viewer" } });
  const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "Postage", kind: "expense" } });
  categoryId = cat.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("budget-service", () => {
  it("sets, lists, updates-in-place, isolates per RLS, and deletes", async () => {
    const saved = await setBudget(admin, workspaceId, categoryId, "6500.00");
    expect(compare(saved.amount, money("6500.00"))).toBe(0);

    let list = await listBudgets(admin, workspaceId);
    expect(list).toHaveLength(1);
    expect(compare(list[0]!.amount, money("6500.00"))).toBe(0);

    // Same category again → update in place (still one row).
    await setBudget(admin, workspaceId, categoryId, "7000.00");
    list = await listBudgets(admin, workspaceId);
    expect(list).toHaveLength(1);
    expect(compare(list[0]!.amount, money("7000.00"))).toBe(0);

    // A stranger sees no rows via RLS.
    const strangerRows = await rlsClientFor(stranger).run((tx) =>
      tx.budget.findMany({ where: { workspaceId } }),
    );
    expect(strangerRows).toHaveLength(0);

    await deleteBudget(admin, workspaceId, list[0]!.id);
    expect(await listBudgets(admin, workspaceId)).toHaveLength(0);
  });

  it("denies a viewer (write needs admin)", async () => {
    await expect(setBudget(viewer, workspaceId, categoryId, "100.00")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("moves money between category budgets atomically and enforces the cap", async () => {
    const dining = await prismaAdmin.category.create({ data: { workspaceId, name: "Dining X", kind: "expense" } });
    await setBudget(admin, workspaceId, categoryId, "200.00"); // Postage
    await setBudget(admin, workspaceId, dining.id, "100.00");

    await moveBudget(admin, workspaceId, dining.id, categoryId, "50.00");
    const list = await listBudgets(admin, workspaceId);
    const postage = list.find((b) => b.categoryId === categoryId)!;
    const din = list.find((b) => b.categoryId === dining.id)!;
    expect(compare(postage.amount, money("250.00"))).toBe(0);
    expect(compare(din.amount, money("50.00"))).toBe(0);

    await expect(moveBudget(admin, workspaceId, dining.id, categoryId, "500.00")).rejects.toThrow(
      "You can only move up to",
    );
    await expect(moveBudget(admin, workspaceId, dining.id, dining.id, "10.00")).rejects.toThrow(
      "different categories",
    );

    // Clean up rows this test added so the first test's expectations stay valid on re-runs.
    for (const b of await listBudgets(admin, workspaceId)) {
      await deleteBudget(admin, workspaceId, b.id);
    }
  });
});
