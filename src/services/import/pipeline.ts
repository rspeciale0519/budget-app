import type { ImportBatch } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { matchRules } from "@/services/category-rule-service";
import { listRulesByWorkspace } from "@/repositories/category-repo";
import { dedupeHash } from "@/lib/dedupe";
import { money, add, sum, compare, type Money } from "@/lib/money";
import { toUtcDate, type CalendarDate } from "@/lib/calendar-date";
import { parseCsv, parseImportDate } from "@/services/import/parse";
import { applySignRule } from "@/services/import/sign-rule";
import type { MappingConfig } from "@/services/import/types";
import * as repo from "@/repositories/import-repo";

export interface ParsedRow {
  date: CalendarDate;
  amount: Money;
  description: string;
  merchant: string | null;
  runningBalance: Money | null;
}

export interface PreviewRow {
  raw: Record<string, string>;
  parsed: ParsedRow | null;
  dedupeHash: string | null;
  proposedCategoryId: string | null;
  isTransferGuess: boolean;
  isDuplicate: boolean;
  skip: boolean;
  errors: string[];
}

export interface ReconcileResult {
  computed: string;
  reported: string;
  mismatch: boolean;
}

export interface ImportPreview {
  accountId: string;
  rows: PreviewRow[];
  reconcile: ReconcileResult | null;
}

export interface PreviewInput {
  accountId: string;
  csvText: string;
  mapping: MappingConfig;
}

function cell(row: Record<string, string>, header: string | undefined): string | undefined {
  return header ? row[header] : undefined;
}

export async function previewImport(actorUserId: string, input: PreviewInput): Promise<ImportPreview> {
  const account = await rlsClientFor(actorUserId).run((tx) => tx.account.findUnique({ where: { id: input.accountId } }));
  if (!account) throw new ForbiddenError("Account not found or access denied");
  await assertWorkspaceAccess(actorUserId, account.workspaceId, "admin");

  const { columnMap, signRule, dateFormat } = input.mapping;
  const { rows } = parseCsv(input.csvText);

  return rlsClientFor(actorUserId, { timeout: 30000 }).run(async (tx) => {
    const existing = await repo.listAccountHashes(tx, input.accountId);
    const seen = new Set(existing.map((e) => e.dedupeHash));
    // Fetch category rules ONCE; matching each row is then pure in-memory work.
    const rules = await listRulesByWorkspace(tx, account.workspaceId);

    const previewRows: PreviewRow[] = [];
    for (const raw of rows) {
      const errors: string[] = [];
      let parsed: ParsedRow | null = null;
      let hash: string | null = null;
      let isDuplicate = false;
      let proposedCategoryId: string | null = null;

      try {
        const date = parseImportDate(cell(raw, columnMap.date) ?? "", dateFormat);
        const amount = applySignRule(signRule, {
          amount: cell(raw, columnMap.amount),
          debit: cell(raw, columnMap.debit),
          credit: cell(raw, columnMap.credit),
        });
        const description = (cell(raw, columnMap.description) ?? "").trim();
        if (description === "") errors.push("Missing description");
        const merchant = (cell(raw, columnMap.merchant) ?? "").trim() || null;
        const rbRaw = (cell(raw, columnMap.runningBalance) ?? "").trim().replace(/[$,]/g, "");
        const runningBalance = rbRaw === "" ? null : money(rbRaw);
        parsed = { date, amount, description, merchant, runningBalance };
        hash = dedupeHash({ accountId: input.accountId, date, amount, description, runningBalance });
        isDuplicate = seen.has(hash);
        if (!isDuplicate) seen.add(hash);
        proposedCategoryId = matchRules(rules, { description, merchant });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Unparseable row");
      }

      const isTransferGuess = (parsed?.description ?? "").toLowerCase().includes("transfer");
      previewRows.push({
        raw,
        parsed,
        dedupeHash: hash,
        proposedCategoryId,
        isTransferGuess,
        isDuplicate,
        skip: isDuplicate || errors.length > 0,
        errors,
      });
    }

    let reconcile: ReconcileResult | null = null;
    if (columnMap.runningBalance) {
      const lastReported = [...previewRows].reverse().find((r) => r.parsed?.runningBalance);
      const reported = lastReported?.parsed?.runningBalance ?? null;
      if (reported) {
        const existingSum = await tx.transaction.aggregate({ where: { accountId: input.accountId }, _sum: { amount: true } });
        const committable = previewRows.filter((r) => !r.skip && r.parsed).map((r) => r.parsed!.amount);
        const computed = add(
          add(money(account.openingBalance.toFixed(2)), money(existingSum._sum.amount?.toFixed(2) ?? "0")),
          sum(committable),
        );
        reconcile = {
          computed: computed.toFixed(2),
          reported: reported.toFixed(2),
          mismatch: compare(computed, reported) !== 0,
        };
      }
    }

    return { accountId: input.accountId, rows: previewRows, reconcile };
  });
}

export interface CommitInput {
  accountId: string;
  filename: string;
  rows: PreviewRow[];
}

export async function commitImport(actorUserId: string, input: CommitInput): Promise<ImportBatch> {
  const account = await rlsClientFor(actorUserId).run((tx) => tx.account.findUnique({ where: { id: input.accountId } }));
  if (!account) throw new ForbiddenError("Account not found or access denied");
  await assertWorkspaceAccess(actorUserId, account.workspaceId, "admin");

  const committable = input.rows.filter((r) => !r.skip && r.errors.length === 0 && r.parsed);

  return rlsClientFor(actorUserId).run(async (tx) => {
    const batch = await repo.insertBatch(tx, {
      workspaceId: account.workspaceId,
      accountId: input.accountId,
      filename: input.filename,
      rowCount: committable.length,
      status: "committed",
    });
    if (committable.length > 0) {
      await repo.insertTransactionsMany(
        tx,
        committable.map((r) => {
          const parsed = r.parsed!;
          return {
            workspaceId: account.workspaceId,
            accountId: input.accountId,
            date: toUtcDate(parsed.date),
            amount: parsed.amount.toFixed(2),
            description: parsed.description,
            merchant: parsed.merchant,
            categoryId: r.proposedCategoryId ?? undefined,
            source: "csv" as const,
            importBatchId: batch.id,
            dedupeHash:
              r.dedupeHash ??
              dedupeHash({
                accountId: input.accountId,
                date: parsed.date,
                amount: parsed.amount,
                description: parsed.description,
                runningBalance: parsed.runningBalance,
              }),
            isTransfer: r.isTransferGuess,
          };
        }),
      );
    }
    return batch;
  });
}

export async function undoImport(actorUserId: string, batchId: string): Promise<void> {
  const batch = await rlsClientFor(actorUserId).run((tx) => repo.findBatch(tx, batchId));
  if (!batch) throw new ForbiddenError("Import batch not found or access denied");
  await assertWorkspaceAccess(actorUserId, batch.workspaceId, "admin");
  await rlsClientFor(actorUserId).run(async (tx) => {
    await repo.deleteBatchTransactions(tx, batchId);
    await repo.archiveBatch(tx, batchId);
  });
}
