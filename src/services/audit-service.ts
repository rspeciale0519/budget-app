import type { Prisma } from "@prisma/client";
import type { RlsTx } from "@/lib/prisma-rls";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertOrgRole } from "@/services/authz";
import * as repo from "@/repositories/audit-repo";

export interface AuditInput {
  userId: string;
  organizationId?: string;
  workspaceId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Append an audit entry within the caller's transaction (atomic with the
 * mutation). Resolves organizationId from workspaceId when not supplied.
 */
export async function audit(db: RlsTx, input: AuditInput): Promise<void> {
  let organizationId = input.organizationId;
  if (!organizationId && input.workspaceId) {
    const ws = await db.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { organizationId: true },
    });
    organizationId = ws?.organizationId;
  }
  if (!organizationId) return;
  await repo.insertAudit(db, {
    organizationId,
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: toJson(input.before),
    after: toJson(input.after),
  });
}

export async function listAudit(
  actorUserId: string,
  organizationId: string,
  filter: { workspaceId?: string; limit?: number } = {},
) {
  await assertOrgRole(actorUserId, organizationId, "admin");
  const take = Math.min(500, Math.max(1, filter.limit ?? 100));
  const where: Prisma.AuditLogWhereInput = filter.workspaceId
    ? { workspaceId: filter.workspaceId }
    : {};
  return rlsClientFor(actorUserId).run((tx) => repo.listAuditByOrg(tx, organizationId, where, take));
}
