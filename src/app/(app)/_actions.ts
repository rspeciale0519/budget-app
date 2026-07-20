"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { createWorkspace } from "@/services/workspace-service";
import { actionErrorMessage } from "@/lib/action-error";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createWorkspaceAction(input: {
  organizationId: string;
  name: string;
  type: "personal" | "business";
  color: string;
}): Promise<{ ok: boolean; error?: string; workspaceId?: string }> {
  try {
    const userId = await requireUserId();
    const ws = await createWorkspace(userId, input.organizationId, {
      name: input.name,
      type: input.type,
      color: input.color,
    });
    revalidatePath("/");
    return { ok: true, workspaceId: ws.id };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "Could not create the book") };
  }
}
