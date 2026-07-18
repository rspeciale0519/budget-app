"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  updateTransaction,
  deleteTransaction,
} from "@/services/transaction-service";
import { createRule } from "@/services/category-rule-service";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

async function run(workspaceId: string, fn: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await fn(userId);
    revalidatePath(`/w/${workspaceId}/transactions`);
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Action failed" };
  }
}

export async function setTransactionCategoryAction(
  workspaceId: string,
  transactionId: string,
  categoryId: string | null,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => updateTransaction(userId, transactionId, { categoryId }));
}

export async function updateTransactionAction(
  workspaceId: string,
  transactionId: string,
  input: { date?: string; amount?: string; description?: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) => updateTransaction(userId, transactionId, input));
}

export async function deleteTransactionAction(
  workspaceId: string,
  transactionId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => deleteTransaction(userId, transactionId));
}

export async function markTransferAction(
  workspaceId: string,
  transactionId: string,
  isTransfer: boolean,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => updateTransaction(userId, transactionId, { isTransfer }));
}

export async function createRuleFromTransactionAction(
  workspaceId: string,
  pattern: string,
  categoryId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    createRule(userId, workspaceId, { match: "contains", pattern, categoryId, priority: 0 }),
  );
}
