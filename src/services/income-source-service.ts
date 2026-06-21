import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, ForbiddenError } from "@/services/authz";
import { toUtcDate } from "@/lib/calendar-date";
import { createIncomeSourceSchema, type CreateIncomeSourceInput } from "@/lib/zod/income";
import * as repo from "@/repositories/income-source-repo";

export async function createIncomeSource(
  actorUserId: string,
  workspaceId: string,
  input: CreateIncomeSourceInput,
) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "admin");
  const data = createIncomeSourceSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.insertIncomeSource(tx, {
      workspaceId,
      name: data.name,
      amount: data.amount.toFixed(2),
      frequency: data.frequency,
      interval: data.interval,
      dayOfMonth: data.dayOfMonth,
      nextDate: toUtcDate(data.nextDate),
      endDate: data.endDate ? toUtcDate(data.endDate) : null,
    }),
  );
}

export async function listIncomeSources(actorUserId: string, workspaceId: string) {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  return rlsClientFor(actorUserId).run((tx) => repo.listByWorkspace(tx, workspaceId));
}

async function loadForAdmin(actorUserId: string, sourceId: string) {
  const source = await rlsClientFor(actorUserId).run((tx) => repo.findIncomeSource(tx, sourceId));
  if (!source) throw new ForbiddenError("Income source not found or access denied");
  await assertWorkspaceAccess(actorUserId, source.workspaceId, "admin");
  return source;
}

export async function updateIncomeSource(
  actorUserId: string,
  sourceId: string,
  input: CreateIncomeSourceInput,
) {
  await loadForAdmin(actorUserId, sourceId);
  const data = createIncomeSourceSchema.parse(input);
  return rlsClientFor(actorUserId).run((tx) =>
    repo.updateIncomeSourceRow(tx, sourceId, {
      name: data.name,
      amount: data.amount.toFixed(2),
      frequency: data.frequency,
      interval: data.interval,
      dayOfMonth: data.dayOfMonth ?? null,
      nextDate: toUtcDate(data.nextDate),
      endDate: data.endDate ? toUtcDate(data.endDate) : null,
    }),
  );
}

export async function deleteIncomeSource(actorUserId: string, sourceId: string) {
  await loadForAdmin(actorUserId, sourceId);
  return rlsClientFor(actorUserId).run((tx) => repo.deleteIncomeSource(tx, sourceId));
}
