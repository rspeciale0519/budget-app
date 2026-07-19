import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess, assertOrgRole, listAccessibleWorkspaces } from "@/services/authz";
import { money, add } from "@/lib/money";
import { fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";

export interface DateRange {
  from?: CalendarDate;
  to?: CalendarDate;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Neutralize CSV formula injection in user-controlled free text: a leading
 * =, +, -, @, tab, or CR can execute as a formula in spreadsheet apps. Apply
 * to text fields only — never to numeric amounts (a negative number is valid).
 */
function guardFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function toRow(cells: string[]): string {
  return cells.map(csvEscape).join(",");
}

export async function exportTransactionsCsv(
  actorUserId: string,
  workspaceId: string,
  range: DateRange = {},
): Promise<string> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const txns = await rlsClientFor(actorUserId).run((tx) =>
    tx.transaction.findMany({
      where: {
        workspaceId,
        ...(range.from || range.to
          ? {
              date: {
                ...(range.from ? { gte: toUtcDate(range.from) } : {}),
                ...(range.to ? { lte: toUtcDate(range.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  );
  const header = ["date", "description", "merchant", "amount", "categoryId", "isTransfer", "source"];
  const lines = [
    toRow(header),
    ...txns.map((t) =>
      toRow([
        fromDbDate(t.date),
        guardFormula(t.description),
        guardFormula(t.merchant ?? ""),
        t.amount.toFixed(2),
        t.categoryId ?? "",
        String(t.isTransfer),
        t.source,
      ]),
    ),
  ];
  return lines.join("\n");
}

export async function exportBillsCsv(
  actorUserId: string,
  workspaceId: string,
  range: DateRange = {},
): Promise<string> {
  await assertWorkspaceAccess(actorUserId, workspaceId, "viewer");
  const bills = await rlsClientFor(actorUserId).run((tx) =>
    tx.bill.findMany({
      where: {
        workspaceId,
        ...(range.from || range.to
          ? {
              dueDate: {
                ...(range.from ? { gte: toUtcDate(range.from) } : {}),
                ...(range.to ? { lte: toUtcDate(range.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { dueDate: "asc" },
    }),
  );
  const header = ["vendor", "amount", "dueDate", "status", "type"];
  const lines = [
    toRow(header),
    ...bills.map((b) =>
      toRow([guardFormula(b.vendor), b.amount.toFixed(2), fromDbDate(b.dueDate), b.status, b.type]),
    ),
  ];
  return lines.join("\n");
}

/** Per-workspace net position across the org (no transfer-netting yet — Phase 2). */
export async function exportRollupCsv(actorUserId: string, organizationId: string): Promise<string> {
  await assertOrgRole(actorUserId, organizationId, "member");
  const workspaces = (await listAccessibleWorkspaces(actorUserId)).filter(
    (w) => w.organizationId === organizationId,
  );
  const header = ["workspace", "type", "balance", "unpaidBills"];
  const rows: string[] = [];
  for (const ws of workspaces) {
    const data = await rlsClientFor(actorUserId).run(async (tx) => {
      const accAgg = await tx.account.aggregate({ where: { workspaceId: ws.id }, _sum: { openingBalance: true } });
      const txAgg = await tx.transaction.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } });
      const billAgg = await tx.bill.aggregate({
        where: { workspaceId: ws.id, status: { in: ["unpaid", "scheduled", "overdue"] } },
        _sum: { amount: true },
      });
      return {
        balance: add(
          money(accAgg._sum.openingBalance?.toFixed(2) ?? "0"),
          money(txAgg._sum.amount?.toFixed(2) ?? "0"),
        ),
        unpaid: money(billAgg._sum.amount?.toFixed(2) ?? "0"),
      };
    });
    rows.push(toRow([guardFormula(ws.name), ws.type, data.balance.toFixed(2), data.unpaid.toFixed(2)]));
  }
  return [toRow(header), ...rows].join("\n");
}
