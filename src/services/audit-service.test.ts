import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listAudit } from "@/services/audit-service";
import { createWorkspace } from "@/services/workspace-service";
import { ForbiddenError } from "@/services/authz";

const owner = randomUUID();
const member = randomUUID();
let orgId: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "Audit Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: owner, role: "owner" } });
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: member, role: "member" } });
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
});

describe("audit-service", () => {
  it("records a create action and lists it for an org admin", async () => {
    const ws = await createWorkspace(owner, orgId, { name: "Audited", type: "business", color: "#999999" });
    const entries = await listAudit(owner, orgId);
    const entry = entries.find((e) => e.entityId === ws.id);
    expect(entry?.action).toBe("create");
    expect(entry?.entityType).toBe("Workspace");
  });

  it("denies the audit log to a non-admin org member", async () => {
    await expect(listAudit(member, orgId)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
