import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import {
  bootstrapOrgForUser,
  assignWorkspaceMembership,
  revokeWorkspaceMembership,
  listMembers,
} from "@/services/membership-service";
import { ForbiddenError } from "@/services/authz";

const owner = randomUUID();
const teammate = randomUUID();
const orgIds: string[] = [];

afterAll(async () => {
  await prismaAdmin.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prismaAdmin.$disconnect();
});

describe("membership-service", () => {
  it("bootstrapOrgForUser is idempotent (no duplicate org or Personal)", async () => {
    const org1 = await bootstrapOrgForUser(owner);
    orgIds.push(org1.id);
    const org2 = await bootstrapOrgForUser(owner);
    expect(org2.id).toBe(org1.id);
    const personals = await prismaAdmin.workspace.findMany({
      where: { organizationId: org1.id, type: "personal" },
    });
    expect(personals).toHaveLength(1);
    const cats = await prismaAdmin.category.count({ where: { workspaceId: personals[0]!.id } });
    expect(cats).toBeGreaterThanOrEqual(15);
  });

  it("grants workspace access and the grantee can see only that workspace", async () => {
    const org = await bootstrapOrgForUser(owner);
    const personal = await prismaAdmin.workspace.findFirstOrThrow({
      where: { organizationId: org.id, type: "personal" },
    });
    const business = await prismaAdmin.workspace.create({
      data: { organizationId: org.id, name: "Acme", type: "business", color: "#10b981" },
    });

    await assignWorkspaceMembership(owner, { userId: teammate, workspaceId: business.id, role: "admin" });

    const visible = await rlsClientFor(teammate).run((tx) => tx.workspace.findMany());
    const ids = visible.map((w) => w.id);
    expect(ids).toContain(business.id);
    expect(ids).not.toContain(personal.id); // business-only teammate can't see Personal

    await revokeWorkspaceMembership(owner, { userId: teammate, workspaceId: business.id });
    const afterRevoke = await rlsClientFor(teammate).run((tx) => tx.workspace.findMany());
    expect(afterRevoke.map((w) => w.id)).not.toContain(business.id);
  });

  it("listMembers requires an org admin", async () => {
    const org = await bootstrapOrgForUser(owner);
    await expect(listMembers(teammate, org.id)).rejects.toBeInstanceOf(ForbiddenError);
    const members = await listMembers(owner, org.id);
    expect(members.some((m) => m.userId === owner && m.role === "owner")).toBe(true);
  });
});
