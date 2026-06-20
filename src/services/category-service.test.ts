import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { seedDefaultCategories, listCategories } from "@/services/category-service";
import { createRule, applyRules } from "@/services/category-rule-service";

const admin = randomUUID();
let orgId: string;
let workspaceId: string;
let groceriesId: string;
let diningId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Cat Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "W", type: "business", color: "#0a0a0a" },
  });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await seedDefaultCategories(prismaAdmin, workspaceId);
  const cats = await prismaAdmin.category.findMany({ where: { workspaceId } });
  groceriesId = cats.find((c) => c.name === "Groceries")!.id;
  diningId = cats.find((c) => c.name === "Dining")!.id;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("category seeding + rules", () => {
  it("seeds the default category set", async () => {
    const list = await listCategories(admin, workspaceId);
    expect(list.length).toBeGreaterThanOrEqual(15);
    expect(list.map((c) => c.name)).toContain("Groceries");
  });

  it("applyRules returns the highest-priority matching category", async () => {
    await createRule(admin, workspaceId, { match: "contains", pattern: "market", categoryId: groceriesId, priority: 1 });
    await createRule(admin, workspaceId, { match: "contains", pattern: "whole foods market", categoryId: diningId, priority: 10 });
    const id = await applyRules(prismaAdmin, workspaceId, { description: "WHOLE FOODS MARKET #123" });
    expect(id).toBe(diningId); // higher priority wins despite both matching
  });

  it("honors equals vs contains and returns null on no match", async () => {
    await createRule(admin, workspaceId, { match: "equals", pattern: "exact vendor", categoryId: groceriesId, priority: 5 });
    expect(await applyRules(prismaAdmin, workspaceId, { description: "exact vendor" })).toBe(groceriesId);
    expect(await applyRules(prismaAdmin, workspaceId, { description: "no rule matches this" })).toBeNull();
  });
});
