import type { z } from "zod";
import { money, add, type Money } from "@/lib/money";
import { toUtcDate } from "@/lib/calendar-date";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { createAccountSchema, updateAccountSchema } from "@/lib/zod/entities";
import * as repo from "@/repositories/account-repo";

export async function createAccount(
  actorUserId: string,
  workspaceId: string,
  input: z.input<typeof createAccountSchema>,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createAccountSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.insertAccount(tx, {
      workspaceId,
      name: data.name,
      type: data.type,
      institution: data.institution,
      last4: data.last4,
      openingBalance: data.openingBalance.toFixed(2),
      openingDate: toUtcDate(data.openingDate),
      currency: data.currency,
    }),
  );
}

export async function updateAccount(
  actorUserId: string,
  accountId: string,
  input: z.input<typeof updateAccountSchema>,
) {
  const account = await rlsClientFor(actorUserId).run((tx) => repo.findAccount(tx, accountId));
  if (!account) throw new ForbiddenError("Account not found or access denied");
  await assertWorkspaceAccess(actorUserId, account.workspaceId, "admin");
  const data = updateAccountSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) => repo.updateAccountRow(tx, accountId, data));
}

export async function archiveAccount(actorUserId: string, accountId: string) {
  const account = await rlsClientFor(actorUserId).run((tx) => repo.findAccount(tx, accountId));
  if (!account) throw new ForbiddenError("Account not found or access denied");
  await assertWorkspaceAccess(actorUserId, account.workspaceId, "admin");
  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateAccountRow(tx, accountId, { archivedAt: new Date() }),
  );
}

export async function listAccounts(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.listAccountsByWorkspace(tx, workspaceId));
}

/** Live balance = openingBalance + Σ(transactions). Never stored. */
export async function getAccountBalance(actorUserId: string, accountId: string): Promise<Money> {
  return rlsClientFor(actorUserId).run(async (tx) => {
    const account = await repo.findAccount(tx, accountId);
    if (!account) throw new ForbiddenError("Account not found or access denied");
    const agg = await repo.sumTransactions(tx, accountId);
    const txSum = agg._sum.amount ? money(agg._sum.amount.toFixed(2)) : money(0);
    return add(money(account.openingBalance.toFixed(2)), txSum);
  });
}
