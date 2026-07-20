"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { listAccessibleWorkspaces } from "@/services/authz";
import { listTransactions } from "@/services/transaction-service";
import { fromDbDate } from "@/lib/calendar-date";
import { formatDate } from "@/lib/format-date";
import { money, format } from "@/lib/money";

export interface TransactionHit {
  workspaceId: string;
  workspaceName: string;
  description: string;
  amount: string;
  date: string;
}

/** Palette data search: top transaction matches across the user's books.
 * Authz rides on listAccessibleWorkspaces + listTransactions (viewer). */
export async function searchTransactionsAction(query: string): Promise<TransactionHit[]> {
  try {
    const q = query.trim();
    if (q.length < 3) return [];
    const user = await getCurrentUser();
    if (!user) return [];
    const books = (await listAccessibleWorkspaces(user.id)).slice(0, 10);
    const perBook = await Promise.all(
      books.map(async (w) => {
        const { rows } = await listTransactions(user.id, w.id, { search: q, pageSize: 3 });
        return rows.map((t) => ({
          workspaceId: w.id,
          workspaceName: w.name,
          description: t.description,
          amount: format(money(t.amount.toFixed(2))),
          date: formatDate(fromDbDate(t.date)),
        }));
      }),
    );
    return perBook.flat().slice(0, 9);
  } catch {
    return [];
  }
}
