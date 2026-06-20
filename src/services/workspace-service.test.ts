import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  createWorkspace,
  updateWorkspace,
  archiveWorkspace,
  listWorkspaces,
  getWorkspace,
} from "@/services/workspace-service";
import { ForbiddenError } from "@/services/authz";

const ownerUser = randomUUID();
const memberUser = randomUUID();
let orgId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "WS Svc Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: ownerUser, role: "owner" } });
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: memberUser, role: "member" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("workspace-service", () => {
  it("creates a workspace (org-admin only) and auto-grants the creator admin", async () => {
    const ws = await createWorkspace(ownerUser, orgId, {
      name: "Personal",
      type: "personal",
      color: "#3b82f6",
    });
    expect(ws.name).toBe("Personal");
    const membership = await prismaAdmin.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: ws.id, userId: ownerUser } },
    });
    expect(membership?.role).toBe("admin");
  });

  it("rejects creation by a non-admin org member", async () => {
    await expect(
      createWorkspace(memberUser, orgId, { name: "X", type: "business", color: "#10b981" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates customization and archives (soft-delete)", async () => {
    const ws = await createWorkspace(ownerUser, orgId, {
      name: "Biz",
      type: "business",
      color: "#10b981",
    });
    const updated = await updateWorkspace(ownerUser, ws.id, { name: "Biz Renamed", color: "#ef4444" });
    expect(updated.name).toBe("Biz Renamed");
    expect(updated.color).toBe("#ef4444");

    await archiveWorkspace(ownerUser, ws.id);
    const stillThere = await prismaAdmin.workspace.findUnique({ where: { id: ws.id } });
    expect(stillThere?.archivedAt).not.toBeNull();

    const list = await listWorkspaces(ownerUser);
    expect(list.map((w) => w.id)).not.toContain(ws.id);
  });

  it("denies read to a non-member", async () => {
    const ws = await createWorkspace(ownerUser, orgId, {
      name: "Secret",
      type: "business",
      color: "#222222",
    });
    await expect(getWorkspace(memberUser, ws.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
