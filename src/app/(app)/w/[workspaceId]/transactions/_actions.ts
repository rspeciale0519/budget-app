"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  updateTransaction,
  deleteTransaction,
} from "@/services/transaction-service";
import {
  createRule,
  updateRule,
  deleteRule,
  countUncategorizedMatching,
  applyCategoryToMatching,
} from "@/services/category-rule-service";
import { actionErrorMessage } from "@/lib/action-error";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function msg(e: unknown): string {
  return actionErrorMessage(e, "Action failed");
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
    return { ok: false, error: actionErrorMessage(e, "Action failed") };
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

/** Save an "Always" rule and report how many OTHER uncategorized transactions
 * the pattern would also match (for the follow-up "apply to N similar?" offer). */
export async function saveRuleAction(
  workspaceId: string,
  pattern: string,
  categoryId: string,
): Promise<ActionResult & { similar?: number }> {
  try {
    const userId = await requireUserId();
    await createRule(userId, workspaceId, { match: "contains", pattern, categoryId, priority: 0 });
    const similar = await countUncategorizedMatching(userId, workspaceId, pattern);
    revalidatePath(`/w/${workspaceId}/transactions`);
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true, similar };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Count uncategorized transactions matching a pattern (used after a manual
 * categorize to offer "apply to N similar?"). */
export async function countSimilarAction(
  workspaceId: string,
  pattern: string,
  excludeTransactionId?: string,
): Promise<{ ok: boolean; count: number }> {
  try {
    const userId = await requireUserId();
    const count = await countUncategorizedMatching(userId, workspaceId, pattern, excludeTransactionId);
    return { ok: true, count };
  } catch {
    return { ok: false, count: 0 };
  }
}

export async function applyToSimilarAction(
  workspaceId: string,
  pattern: string,
  categoryId: string,
): Promise<ActionResult & { count?: number }> {
  try {
    const userId = await requireUserId();
    const count = await applyCategoryToMatching(userId, workspaceId, pattern, categoryId);
    revalidatePath(`/w/${workspaceId}/transactions`);
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function deleteRuleAction(workspaceId: string, ruleId: string): Promise<ActionResult> {
  return run(workspaceId, (userId) => deleteRule(userId, ruleId));
}

export async function updateRuleAction(
  workspaceId: string,
  ruleId: string,
  input: { pattern?: string; categoryId?: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) => updateRule(userId, ruleId, input));
}
