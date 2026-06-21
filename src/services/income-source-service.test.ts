import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { createIncomeSource, listIncomeSources, deleteIncomeSource } from "@/services/income-source-service";
import { ForbiddenError } from "@/services/authz";

const admin = randomUUID();
const viewer = randomUUID();
const stranger = randomUUID();
let orgId: string;
let workspaceId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Income Svc Org" } });
  orgId = org.id;
  const ws = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "W", type: "business", color: "#777777" } });
  workspaceId = ws.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: admin, role: "owner" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: admin, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId, userId: viewer, role: "viewer" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("income-source-service", () => {
  it("creates (admin), lists, and deletes an income source", async () => {
    const src = await createIncomeSource(admin, workspaceId, {
      name: "Salary",
      amount: "4000.00",
      frequency: "monthly",
      nextDate: "2026-07-01",
    });
    const list = await listIncomeSources(admin, workspaceId);
    expect(list.map((s) => s.id)).toContain(src.id);
    await deleteIncomeSource(admin, src.id);
    const after = await listIncomeSources(admin, workspaceId);
    expect(after.map((s) => s.id)).not.toContain(src.id);
  });

  it("denies create to a viewer", async () => {
    await expect(
      createIncomeSource(viewer, workspaceId, { name: "X", amount: "1.00", frequency: "monthly", nextDate: "2026-07-01" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("hides income sources from a non-member via RLS", async () => {
    await createIncomeSource(admin, workspaceId, { name: "Retainer", amount: "2000.00", frequency: "monthly", nextDate: "2026-07-01" });
    const seen = await rlsClientFor(stranger).run((tx) => tx.incomeSource.findMany({ where: { workspaceId } }));
    expect(seen).toHaveLength(0);
  });
});
