"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { previewImport, commitImport, undoImport } from "@/services/import";
import { listCategories } from "@/services/category-service";
import type { MappingConfig } from "@/services/import";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export interface SerializableRow {
  description: string;
  merchant: string;
  date: string;
  amount: string;
  category: string | null;
  isTransfer: boolean;
  isDuplicate: boolean;
  errors: string[];
  skip: boolean;
}

export interface ImportSummary {
  total: number;
  newCount: number;
  duplicateCount: number;
  errorCount: number;
}

export interface PreviewActionResult {
  ok: boolean;
  error?: string;
  rows: SerializableRow[];
  summary: ImportSummary;
  reconcile: { computed: string; reported: string; mismatch: boolean } | null;
}

const EMPTY_SUMMARY: ImportSummary = { total: 0, newCount: 0, duplicateCount: 0, errorCount: 0 };

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Action failed";
}

export async function previewImportAction(
  workspaceId: string,
  accountId: string,
  csvText: string,
  mapping: MappingConfig,
  dateOverrides?: Record<number, string>,
): Promise<PreviewActionResult> {
  try {
    const userId = await requireUserId();
    const preview = await previewImport(userId, { accountId, csvText, mapping, dateOverrides });
    const categories = await listCategories(userId, workspaceId).catch(() => []);
    const catName = new Map(categories.map((c) => [c.id, c.name]));

    const rows: SerializableRow[] = preview.rows.map((r) => ({
      description: r.parsed?.description ?? "(unparsed)",
      merchant: r.parsed?.merchant ?? "",
      date: r.parsed?.date ?? "",
      amount: r.parsed?.amount.toFixed(2) ?? "",
      category: r.proposedCategoryId ? (catName.get(r.proposedCategoryId) ?? null) : null,
      isTransfer: r.isTransferGuess,
      isDuplicate: r.isDuplicate,
      errors: r.errors,
      skip: r.skip,
    }));
    const summary: ImportSummary = {
      total: rows.length,
      duplicateCount: rows.filter((r) => r.isDuplicate).length,
      errorCount: rows.filter((r) => r.errors.length > 0).length,
      newCount: rows.filter((r) => !r.isDuplicate && r.errors.length === 0).length,
    };
    return { ok: true, rows, summary, reconcile: preview.reconcile };
  } catch (e) {
    return { ok: false, error: msg(e), rows: [], summary: EMPTY_SUMMARY, reconcile: null };
  }
}

export async function commitImportAction(
  workspaceId: string,
  accountId: string,
  filename: string,
  csvText: string,
  mapping: MappingConfig,
  skipIndices: number[],
  expectedRowCount: number,
  dateOverrides?: Record<number, string>,
): Promise<{ ok: boolean; error?: string; batchId?: string; count?: number }> {
  try {
    const userId = await requireUserId();
    const preview = await previewImport(userId, { accountId, csvText, mapping, dateOverrides });
    if (preview.rows.length !== expectedRowCount) {
      return {
        ok: false,
        error: "This account changed since you reviewed — please review the import again.",
      };
    }
    const skip = new Set(skipIndices);
    preview.rows.forEach((r, i) => {
      if (skip.has(i)) r.skip = true;
    });
    const batch = await commitImport(userId, { accountId, filename, rows: preview.rows });
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true, batchId: batch.id, count: batch.rowCount };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function undoImportAction(
  workspaceId: string,
  batchId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await undoImport(userId, batchId);
    revalidatePath(`/w/${workspaceId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
