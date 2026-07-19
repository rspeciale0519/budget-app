import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { seedDefaultCategories, listCategories, updateCategory, deleteCategory } from "@/services/category-service";
import { createRule, applyRules } from "@/services/category-rule-service";
import { ForbiddenError } from "@/services/authz";

const admin = randomUUID();
const viewer = randomUUID();
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
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: viewer, role: "viewer" } });
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

describe("category rename + delete", () => {
  it("renames a category and rejects a viewer", async () => {
    const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "Temp", kind: "expense" } });
    await expect(updateCategory(viewer, cat.id, { name: "Nope" })).rejects.toBeInstanceOf(ForbiddenError);
    await updateCategory(admin, cat.id, { name: "Renamed" });
    const reread = await prismaAdmin.category.findUniqueOrThrow({ where: { id: cat.id } });
    expect(reread.name).toBe("Renamed");
  });

  it("deletes a category and un-links (not deletes) its transactions", async () => {
    const cat = await prismaAdmin.category.create({ data: { workspaceId, name: "ToDelete", kind: "expense" } });
    const account = await prismaAdmin.account.create({
      data: {
        workspaceId,
        name: "Acc",
        type: "checking",
        institution: "x",
        openingBalance: "0.00",
        openingDate: new Date("2026-01-01"),
      },
    });
    const txn = await prismaAdmin.transaction.create({
      data: {
        workspaceId,
        accountId: account.id,
        date: new Date("2026-01-02"),
        amount: "-10.00",
        description: "test",
        source: "manual",
        dedupeHash: randomUUID(),
        categoryId: cat.id,
      },
    });

    await expect(deleteCategory(viewer, cat.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteCategory(admin, cat.id);

    expect(await prismaAdmin.category.findUnique({ where: { id: cat.id } })).toBeNull();
    const rereadTxn = await prismaAdmin.transaction.findUniqueOrThrow({ where: { id: txn.id } });
    expect(rereadTxn.categoryId).toBeNull();
  });
});
