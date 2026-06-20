import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import {
  assertWorkspaceAccess,
  assertOrgRole,
  listAccessibleWorkspaces,
  ForbiddenError,
} from "@/services/authz";

const owner = randomUUID();
const viewerUser = randomUUID();
const stranger = randomUUID();

let orgId: string;
let adminWs: string;
let viewerWs: string;
let archivedWs: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Authz Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: viewerUser, role: "member" } });

  const a = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "A", type: "business", color: "#1" },
  });
  const v = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "V", type: "business", color: "#2" },
  });
  const arch = await prismaAdmin.workspace.create({
    data: { organizationId: orgId, name: "Old", type: "business", color: "#3", archivedAt: new Date() },
  });
  adminWs = a.id;
  viewerWs = v.id;
  archivedWs = arch.id;

  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: adminWs, userId: owner, role: "admin" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: viewerWs, userId: viewerUser, role: "viewer" } });
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: archivedWs, userId: owner, role: "admin" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("authz", () => {
  it("admin passes both admin and viewer checks", async () => {
    await expect(assertWorkspaceAccess(owner, adminWs, "admin")).resolves.toBeUndefined();
    await expect(assertWorkspaceAccess(owner, adminWs, "viewer")).resolves.toBeUndefined();
  });

  it("viewer passes viewer but is denied admin", async () => {
    await expect(assertWorkspaceAccess(viewerUser, viewerWs, "viewer")).resolves.toBeUndefined();
    await expect(assertWorkspaceAccess(viewerUser, viewerWs, "admin")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("a non-member is denied", async () => {
    await expect(assertWorkspaceAccess(stranger, adminWs, "viewer")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("org role hierarchy: owner satisfies admin; member does not", async () => {
    await expect(assertOrgRole(owner, orgId, "admin")).resolves.toBeUndefined();
    await expect(assertOrgRole(owner, orgId, "owner")).resolves.toBeUndefined();
    await expect(assertOrgRole(viewerUser, orgId, "admin")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lists only accessible, non-archived workspaces", async () => {
    const list = await listAccessibleWorkspaces(owner);
    const ids = list.map((w) => w.id);
    expect(ids).toContain(adminWs);
    expect(ids).not.toContain(archivedWs);
    expect(ids).not.toContain(viewerWs);
  });
});
