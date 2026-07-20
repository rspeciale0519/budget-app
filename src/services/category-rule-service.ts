import type { z } from "zod";
import type { CategoryRule } from "@prisma/client";
import type { Db } from "@/repositories/db";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { categoryRuleSchema } from "@/lib/zod/entities";
import { suggestRulePattern } from "@/lib/rule-pattern";
import * as repo from "@/repositories/category-repo";

export { suggestRulePattern };

export async function createRule(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof categoryRuleSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = categoryRuleSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.insertCategoryRule(tx, {
      workspaceId,
      match: data.match,
      pattern: data.pattern,
      categoryId: data.categoryId,
      priority: data.priority,
    }),
  );
}

export async function listRules(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.listRulesByWorkspace(tx, workspaceId));
}

async function loadRuleForAdmin(actorUserId: string, ruleId: string): Promise<CategoryRule> {
  const rule = await rlsClientFor(actorUserId).run((tx) => repo.findCategoryRule(tx, ruleId));
  if (!rule) throw new ForbiddenError("Rule not found or access denied");
  await assertWorkspaceAccess(actorUserId, rule.workspaceId, "admin");
  return rule;
}

export async function updateRule(
  actorUserId: string,
  ruleId: string,
  input: { pattern?: string; categoryId?: string },
) {
  const rule = await loadRuleForAdmin(actorUserId, ruleId);
  const pattern = input.pattern?.trim();
  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateCategoryRuleRow(tx, rule.id, {
      pattern: pattern && pattern.length > 0 ? pattern : undefined,
      categoryId: input.categoryId ?? undefined,
    }),
  );
}

export async function deleteRule(actorUserId: string, ruleId: string) {
  const rule = await loadRuleForAdmin(actorUserId, ruleId);
  return rlsClientFor(actorUserId).run((tx) => repo.deleteCategoryRuleRow(tx, rule.id));
}

/** Count OTHER uncategorized, non-transfer transactions whose text contains the
 * pattern — for the "apply to N similar?" prompt. Never counts the source row. */
export async function countUncategorizedMatching(
  actorUserId: string,
  workspaceId: string,
  pattern: string,
  excludeTransactionId?: string,
): Promise<number> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const needle = pattern.trim().toLowerCase();
  if (!needle) return 0;
  return rlsClientFor(actorUserId).run(async (tx) => {
    const rows = await tx.transaction.findMany({
      where: { workspaceId, categoryId: null, isTransfer: false },
      select: { id: true, description: true, merchant: true },
    });
    return rows.filter(
      (t) =>
        t.id !== excludeTransactionId &&
        `${t.description} ${t.merchant ?? ""}`.toLowerCase().includes(needle),
    ).length;
  });
}

/** Categorize matching uncategorized transactions in bulk. Only ever fills empty
 * categories — it never overwrites a human's existing choice. Returns the count. */
export async function applyCategoryToMatching(
  actorUserId: string,
  workspaceId: string,
  pattern: string,
  categoryId: string,
): Promise<number> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const needle = pattern.trim().toLowerCase();
  if (!needle) return 0;
  return rlsClientFor(actorUserId).run(async (tx) => {
    const rows = await tx.transaction.findMany({
      where: { workspaceId, categoryId: null, isTransfer: false },
      select: { id: true, description: true, merchant: true },
    });
    const ids = rows
      .filter((t) => `${t.description} ${t.merchant ?? ""}`.toLowerCase().includes(needle))
      .map((t) => t.id);
    if (ids.length === 0) return 0;
    await tx.transaction.updateMany({ where: { id: { in: ids } }, data: { categoryId } });
    return ids.length;
  });
}

export interface MatchableRule {
  match: string;
  pattern: string;
  categoryId: string;
}

/**
 * First matching rule (highest priority) for a transaction's text. Pure: takes
 * already-fetched rules so callers in a hot loop (e.g. CSV import of thousands
 * of rows) fetch the rule set once instead of once per row.
 */
export function matchRules(
  rules: MatchableRule[],
  input: { description: string; merchant?: string | null },
): string | null {
  const description = input.description.toLowerCase();
  const merchant = (input.merchant ?? "").toLowerCase();
  const haystack = `${description} ${merchant}`;
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    if (rule.match === "equals") {
      if (description === pattern || merchant === pattern) return rule.categoryId;
    } else if (haystack.includes(pattern)) {
      return rule.categoryId;
    }
  }
  return null;
}

/**
 * Fetch-and-match convenience for single-row callers. Runs on a provided db
 * handle so it can participate in a create transaction.
 */
export async function applyRules(
  db: Db,
  workspaceId: string,
  input: { description: string; merchant?: string | null },
): Promise<string | null> {
  const rules = await repo.listRulesByWorkspace(db, workspaceId);
  return matchRules(rules, input);
}
