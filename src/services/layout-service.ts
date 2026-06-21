import type { Prisma } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertOrgRole } from "@/services/authz";
import { paneConfigSchema, type PaneConfig } from "@/lib/zod/layout";
import * as repo from "@/repositories/layout-repo";

export interface SavedLayout {
  id: string;
  name: string;
  config: PaneConfig;
}

/** Upsert-by-name without a unique constraint: find-then-update/create in one
 * transaction (keeps Phase 2b migration-free). */
export async function saveLayout(
  userId: string,
  organizationId: string,
  name: string,
  config: PaneConfig,
): Promise<SavedLayout> {
  await assertOrgRole(userId, organizationId, "member");
  const validated = paneConfigSchema.parse(config);
  const json = validated as unknown as Prisma.InputJsonValue;
  const row = await rlsClientFor(userId).run(async (tx) => {
    const existing = await repo.findByName(tx, userId, organizationId, name);
    if (existing) return repo.updateConfig(tx, existing.id, json);
    return repo.createLayout(tx, { userId, organizationId, name, config: json });
  });
  return { id: row.id, name: row.name, config: validated };
}

export async function listLayouts(userId: string, organizationId: string): Promise<SavedLayout[]> {
  await assertOrgRole(userId, organizationId, "member");
  const rows = await rlsClientFor(userId).run((tx) => repo.listByOrg(tx, userId, organizationId));
  return rows.map((r) => ({ id: r.id, name: r.name, config: paneConfigSchema.parse(r.config) }));
}

export async function getLayout(userId: string, layoutId: string): Promise<SavedLayout | null> {
  const row = await rlsClientFor(userId).run((tx) => repo.findById(tx, layoutId));
  if (!row) return null;
  return { id: row.id, name: row.name, config: paneConfigSchema.parse(row.config) };
}

export async function deleteLayout(userId: string, layoutId: string): Promise<void> {
  await rlsClientFor(userId).run((tx) => repo.deleteById(tx, layoutId));
}
