"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Frequency } from "@prisma/client";
import { createTransaction } from "@/services/transaction-service";
import { createBill, markPaid, markPaidStandalone, markUnpaid } from "@/services/bill-service";
import { createAccount } from "@/services/account-service";
import { createCategory, updateCategory, deleteCategory } from "@/services/category-service";
import { tagOwnerDraw, createAccountTransfer } from "@/services/transfer-service";
import { createIncomeSource, deleteIncomeSource } from "@/services/income-source-service";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function run(workspaceId: string, fn: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await fn(userId);
    revalidatePath(`/w/${workspaceId}`);
    revalidatePath(`/w/${workspaceId}/manage`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Action failed" };
  }
}

export async function addAccountAction(
  workspaceId: string,
  input: { name: string; type: string; institution: string; openingBalance: string; openingDate: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    createAccount(userId, workspaceId, {
      name: input.name,
      type: input.type as never,
      institution: input.institution,
      openingBalance: input.openingBalance,
      openingDate: input.openingDate,
    }),
  );
}

export async function addCategoryAction(
  workspaceId: string,
  input: { name: string; kind: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    createCategory(userId, workspaceId, { name: input.name, kind: input.kind as never }),
  );
}

export async function renameCategoryAction(
  workspaceId: string,
  categoryId: string,
  name: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => updateCategory(userId, categoryId, { name }));
}

export async function deleteCategoryAction(
  workspaceId: string,
  categoryId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => deleteCategory(userId, categoryId));
}

export async function addTransactionAction(
  workspaceId: string,
  input: { accountId: string; date: string; amount: string; description: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) => createTransaction(userId, workspaceId, input));
}

export async function addBillAction(
  workspaceId: string,
  input: { vendor: string; amount: string; dueDate: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    createBill(userId, workspaceId, { vendor: input.vendor, amount: input.amount, dueDate: input.dueDate }),
  );
}

export async function markBillPaidStandaloneAction(
  workspaceId: string,
  billId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => markPaidStandalone(userId, billId));
}

export async function markBillPaidAction(
  workspaceId: string,
  billId: string,
  payFromAccountId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => markPaid(userId, billId, { payFromAccountId }));
}

export async function markBillUnpaidAction(
  workspaceId: string,
  billId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => markUnpaid(userId, billId));
}

export async function confirmMatchAction(
  workspaceId: string,
  billId: string,
  transactionId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => markPaid(userId, billId, { transactionId }));
}

/** Dismissals are client-only for v1 (no rejected-match table); this exists so
 * the banner has a stable server contract if persistence is added later. */
export async function dismissMatchAction(): Promise<ActionResult> {
  return { ok: true };
}

export async function addIncomeSourceAction(
  workspaceId: string,
  input: { name: string; amount: string; frequency: string; nextDate: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    createIncomeSource(userId, workspaceId, {
      name: input.name,
      amount: input.amount,
      frequency: input.frequency as Frequency,
      nextDate: input.nextDate,
    }),
  );
}

export async function deleteIncomeSourceAction(
  workspaceId: string,
  sourceId: string,
): Promise<ActionResult> {
  return run(workspaceId, (userId) => deleteIncomeSource(userId, sourceId));
}

export async function addAccountTransferAction(
  workspaceId: string,
  input: { fromAccountId: string; toAccountId: string; amount: string; date: string },
): Promise<ActionResult> {
  return run(workspaceId, (userId) => createAccountTransfer(userId, workspaceId, input));
}

export async function tagOwnerDrawAction(
  workspaceId: string,
  input: {
    toWorkspaceId: string;
    toAccountId: string;
    fromAccountId: string;
    amount: string;
    date: string;
  },
): Promise<ActionResult> {
  return run(workspaceId, (userId) =>
    tagOwnerDraw(userId, {
      fromWorkspaceId: workspaceId,
      toWorkspaceId: input.toWorkspaceId,
      toAccountId: input.toAccountId,
      fromAccountId: input.fromAccountId,
      amount: input.amount,
      date: input.date,
    }),
  );
}
