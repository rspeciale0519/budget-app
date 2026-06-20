import type { RlsTx } from "@/lib/prisma-rls";

export interface AuditInput {
  userId: string;
  organizationId: string;
  workspaceId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Append an audit entry within the caller's transaction (atomic with the
 * mutation). NOTE: no-op shim — Task 21 implements persistence + listAudit and
 * verifies wiring. Kept so services can call audit() from the start.
 */
export async function audit(_tx: RlsTx, _input: AuditInput): Promise<void> {
  // Implemented in Task 21.
}
