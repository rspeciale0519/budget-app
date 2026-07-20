"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { setBudget, deleteBudget, moveBudget } from "@/services/budget-service";
import { actionErrorMessage } from "@/lib/action-error";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function setBudgetAction(
  workspaceId: string,
  categoryId: string,
  amount: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await setBudget(userId, workspaceId, categoryId, amount);
    revalidatePath(`/w/${workspaceId}/budget`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "Could not set budget") };
  }
}

export async function moveBudgetAction(
  workspaceId: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await moveBudget(userId, workspaceId, fromCategoryId, toCategoryId, amount);
    revalidatePath(`/w/${workspaceId}/budget`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "Could not move that money") };
  }
}

export async function deleteBudgetAction(workspaceId: string, budgetId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await deleteBudget(userId, workspaceId, budgetId);
    revalidatePath(`/w/${workspaceId}/budget`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "Could not delete budget") };
  }
}
