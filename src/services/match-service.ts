import type { Transaction } from "@prisma/client";
import { rlsClientFor } from "@/lib/prisma-rls";
import { assertWorkspaceAccess } from "@/services/authz";
import { scoreMatch } from "@/lib/match-score";
import { money, format } from "@/lib/money";
import { addDays, fromDbDate, toUtcDate, type CalendarDate } from "@/lib/calendar-date";

export interface MatchSuggestion {
  billId: string;
  vendor: string;
  dueDate: string;
  amount: string;
  transactionId: string;
  txnDescription: string;
  txnDate: string;
  txnAmount: string;
  score: number;
}

/** Conservative floor — the user always confirms, so a missed suggestion is
 * cheaper than a wrong one. Tunable here because the scorer is pure. */
const MIN_SCORE = 0.55;

export async function matchSuggestions(
  userId: string,
  workspaceId: string,
  today: CalendarDate,
): Promise<MatchSuggestion[]> {
  await assertWorkspaceAccess(userId, workspaceId, "viewer");

  return rlsClientFor(userId).run(async (tx) => {
    const bills = await tx.bill.findMany({
      where: {
        workspaceId,
        status: { in: ["unpaid", "scheduled", "overdue"] },
        dueDate: { gte: toUtcDate(addDays(today, -30)), lte: toUtcDate(addDays(today, 30)) },
      },
      orderBy: { dueDate: "asc" },
    });
    if (bills.length === 0) return [];

    const txns = await tx.transaction.findMany({
      where: {
        workspaceId,
        isTransfer: false,
        billId: null,
        amount: { lt: 0 },
        date: { gte: toUtcDate(addDays(today, -35)), lte: toUtcDate(addDays(today, 35)) },
      },
    });

    const used = new Set<string>();
    const suggestions: MatchSuggestion[] = [];

    for (const bill of bills) {
      let best: { txn: Transaction; score: number } | null = null;
      for (const t of txns) {
        if (used.has(t.id)) continue;
        const score = scoreMatch({
          billVendor: bill.vendor,
          billAmount: money(bill.amount.toFixed(2)),
          billDue: fromDbDate(bill.dueDate),
          txnDescription: t.description,
          txnMerchant: t.merchant,
          txnAmount: money(t.amount.toFixed(2)),
          txnDate: fromDbDate(t.date),
        });
        if (score !== null && (best === null || score > best.score)) best = { txn: t, score };
      }
      if (best && best.score >= MIN_SCORE) {
        used.add(best.txn.id);
        suggestions.push({
          billId: bill.id,
          vendor: bill.vendor,
          dueDate: fromDbDate(bill.dueDate),
          amount: format(money(bill.amount.toFixed(2))),
          transactionId: best.txn.id,
          txnDescription: best.txn.description,
          txnDate: fromDbDate(best.txn.date),
          txnAmount: format(money(best.txn.amount.toFixed(2))),
          score: best.score,
        });
      }
    }
    return suggestions;
  });
}
