import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prismaAdmin.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prismaAdmin.$disconnect();
});

describe("identity & access schema", () => {
  it("round-trips an org, workspace, and memberships", async () => {
    const userId = randomUUID();
    const org = await prismaAdmin.organization.create({ data: { name: "Acme" } });
    createdOrgIds.push(org.id);

    await prismaAdmin.orgMembership.create({
      data: { organizationId: org.id, userId, role: "owner" },
    });
    const ws = await prismaAdmin.workspace.create({
      data: { organizationId: org.id, name: "Personal", type: "personal", color: "#3b82f6" },
    });
    await prismaAdmin.workspaceMembership.create({
      data: { workspaceId: ws.id, userId, role: "admin" },
    });

    const readback = await prismaAdmin.workspace.findUniqueOrThrow({
      where: { id: ws.id },
      include: { memberships: true, organization: { include: { memberships: true } } },
    });

    expect(readback.type).toBe("personal");
    expect(readback.color).toBe("#3b82f6");
    expect(readback.archivedAt).toBeNull();
    expect(readback.memberships).toHaveLength(1);
    expect(readback.memberships[0]?.role).toBe("admin");
    expect(readback.organization.memberships[0]?.role).toBe("owner");
  });

  it("enforces one membership per user per workspace", async () => {
    const userId = randomUUID();
    const org = await prismaAdmin.organization.create({ data: { name: "Dup" } });
    createdOrgIds.push(org.id);
    const ws = await prismaAdmin.workspace.create({
      data: { organizationId: org.id, name: "Biz", type: "business", color: "#10b981" },
    });
    await prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws.id, userId, role: "admin" } });
    await expect(
      prismaAdmin.workspaceMembership.create({ data: { workspaceId: ws.id, userId, role: "viewer" } }),
    ).rejects.toThrow();
  });
});
