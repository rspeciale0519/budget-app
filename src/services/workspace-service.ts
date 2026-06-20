import type { z } from "zod";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertOrgRole, assertWorkspaceAccess, listAccessibleWorkspaces } from "@/services/authz";
import { createWorkspaceSchema, updateWorkspaceSchema } from "@/lib/zod/entities";
import { audit } from "@/services/audit-service";
import * as repo from "@/repositories/workspace-repo";

export async function createWorkspace(
  actorUserId: string,
  organizationId: string,
  input: z.input<typeof createWorkspaceSchema>,
) {
  await assertOrgRole(actorUserId, organizationId, "admin");
  const data = createWorkspaceSchema.parse(input);
  // No membership exists yet, so this runs on the privileged client; the
  // creator is immediately granted workspace-admin.
  return prismaAdmin.$transaction(async (tx) => {
    const ws = await repo.insertWorkspace(tx, {
      organizationId,
      name: data.name,
      type: data.type,
      color: data.color,
      icon: data.icon,
    });
    await repo.insertWorkspaceMembership(tx, {
      workspaceId: ws.id,
      userId: actorUserId,
      role: "admin",
    });
    await audit(tx, {
      userId: actorUserId,
      organizationId,
      workspaceId: ws.id,
      action: "create",
      entityType: "Workspace",
      entityId: ws.id,
      after: ws,
    });
    return ws;
  });
}

export async function updateWorkspace(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof updateWorkspaceSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = updateWorkspaceSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) => repo.updateWorkspaceRow(tx, workspaceId, data));
}

/** Never hard-delete — archive instead. */
export async function archiveWorkspace(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateWorkspaceRow(tx, workspaceId, { archivedAt: new Date() }),
  );
}

export function listWorkspaces(actorUserId: string) {
  return listAccessibleWorkspaces(actorUserId);
}

export async function getWorkspace(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.findWorkspace(tx, workspaceId));
}
