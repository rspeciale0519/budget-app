"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  inviteMember,
  assignWorkspaceMembership,
  revokeWorkspaceMembership,
} from "@/services/membership-service";
import type { WorkspaceRole } from "@prisma/client";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function inviteAction(organizationId: string, email: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await inviteMember(userId, organizationId, email);
    revalidatePath("/settings/members");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invite failed" };
  }
}

export async function assignAction(
  workspaceId: string,
  targetUserId: string,
  role: WorkspaceRole,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await assignWorkspaceMembership(userId, { userId: targetUserId, workspaceId, role });
    revalidatePath("/settings/members");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Assign failed" };
  }
}

export async function revokeAction(workspaceId: string, targetUserId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await revokeWorkspaceMembership(userId, { userId: targetUserId, workspaceId });
    revalidatePath("/settings/members");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Revoke failed" };
  }
}
