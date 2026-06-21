"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { previewImport, commitImport, undoImport } from "@/services/import";
import type { MappingConfig } from "@/services/import";

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export interface SerializableRow {
  description: string;
  date: string;
  amount: string;
  isDuplicate: boolean;
  errors: string[];
  skip: boolean;
}

export interface PreviewActionResult {
  ok: boolean;
  error?: string;
  rows: SerializableRow[];
  reconcile: { computed: string; reported: string; mismatch: boolean } | null;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Action failed";
}

export async function previewImportAction(
  accountId: string,
  csvText: string,
  mapping: MappingConfig,
): Promise<PreviewActionResult> {
  try {
    const userId = await requireUserId();
    const preview = await previewImport(userId, { accountId, csvText, mapping });
    return {
      ok: true,
      rows: preview.rows.map((r) => ({
        description: r.parsed?.description ?? "(unparsed)",
        date: r.parsed?.date ?? "",
        amount: r.parsed?.amount.toFixed(2) ?? "",
        isDuplicate: r.isDuplicate,
        errors: r.errors,
        skip: r.skip,
      })),
      reconcile: preview.reconcile,
    };
  } catch (e) {
    return { ok: false, error: msg(e), rows: [], reconcile: null };
  }
}

export async function commitImportAction(
  workspaceId: string,
  accountId: string,
  filename: string,
  csvText: string,
  mapping: MappingConfig,
  skipIndices: number[],
): Promise<{ ok: boolean; error?: string; batchId?: string; count?: number }> {
  try {
    const userId = await requireUserId();
    const preview = await previewImport(userId, { accountId, csvText, mapping });
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
