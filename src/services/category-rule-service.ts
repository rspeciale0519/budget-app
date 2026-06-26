import type { z } from "zod";
import type { Db } from "@/repositories/db";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { categoryRuleSchema } from "@/lib/zod/entities";
import * as repo from "@/repositories/category-repo";

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
