import type { OrgRole, WorkspaceRole, Workspace, OrgMembership } from "@prisma/client";
import { prismaAdmin } from "@/lib/prisma-admin";

// Service-layer authorization: the authoritative access check, independent of
// (and complementary to) Postgres RLS. Reads membership via the privileged
// client so the decision never depends on the very RLS it backs up.

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const orgRoleRank: Record<OrgRole, number> = { member: 0, admin: 1, owner: 2 };

export async function assertWorkspaceAccess(
  userId: string,
  workspaceId: string,
  need: WorkspaceRole,
): Promise<void> {
  const membership = await prismaAdmin.workspaceMembership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw new ForbiddenError("No access to this book");
  // admin ⊇ viewer; viewer satisfies only viewer.
  if (need === "admin" && membership.role !== "admin") {
    throw new ForbiddenError("Admin role required for this book");
  }
}

export async function assertOrgRole(
  userId: string,
  organizationId: string,
  need: OrgRole,
): Promise<void> {
  const membership = await prismaAdmin.orgMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership || orgRoleRank[membership.role] < orgRoleRank[need]) {
    throw new ForbiddenError("Insufficient organization role");
  }
}

/**
 * The user's primary org membership (their own row). A privileged read for the
 * same reason the rest of this module is privileged: it resolves identity/nav
 * context (which org am I in, am I an org admin) and must not depend on the RLS
 * it helps enforce. Keeps prismaAdmin out of pages/components/actions.
 */
export async function getUserPrimaryOrgMembership(
  userId: string,
): Promise<OrgMembership | null> {
  return prismaAdmin.orgMembership.findFirst({ where: { userId } });
}

export async function listAccessibleWorkspaces(userId: string): Promise<Workspace[]> {
  const memberships = await prismaAdmin.workspaceMembership.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const ids = memberships.map((m) => m.workspaceId);
  return prismaAdmin.workspace.findMany({
    where: { id: { in: ids }, archivedAt: null },
    orderBy: { sortOrder: "asc" },
  });
}
