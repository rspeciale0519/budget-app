"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { paneSummaries } from "@/services/dashboard/pane-summary";
import {
  saveLayout,
  listLayouts,
  deleteLayout,
  type SavedLayout,
} from "@/services/layout-service";
import type { PaneConfig } from "@/lib/zod/layout";
import type { PaneSummary } from "@/services/dashboard/pane-summary";
import { today as todayFn } from "@/lib/calendar-date";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function requireOrgId(userId: string): Promise<string> {
  const membership = await prismaAdmin.orgMembership.findFirst({ where: { userId } });
  if (!membership) throw new Error("No organization");
  return membership.organizationId;
}

/** Batch summaries — used on both assign and restore. */
export async function paneSummariesAction(
  workspaceIds: string[],
): Promise<Record<string, PaneSummary>> {
  const userId = await requireUserId();
  return paneSummaries(userId, workspaceIds, todayFn());
}

export async function saveLayoutAction(name: string, config: PaneConfig): Promise<SavedLayout> {
  const userId = await requireUserId();
  const orgId = await requireOrgId(userId);
  return saveLayout(userId, orgId, name, config);
}

export async function listLayoutsAction(): Promise<SavedLayout[]> {
  const userId = await requireUserId();
  const orgId = await requireOrgId(userId);
  return listLayouts(userId, orgId);
}

export async function deleteLayoutAction(layoutId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteLayout(userId, layoutId);
}
