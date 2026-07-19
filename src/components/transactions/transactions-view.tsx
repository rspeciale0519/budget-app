"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/empty/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { TransactionRow, type TransactionRowData } from "@/components/transactions/transaction-row";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
  kind: string;
}

const navCls =
  "rounded-control border border-rule bg-surface px-3 py-1.5 text-sm font-medium text-ink/85 transition-colors hover:border-dim hover:bg-raised";

export function TransactionsView({
  workspaceId,
  rows,
  total,
  page,
  pageSize,
  uncategorizedCount,
  accounts,
  categories,
  filters,
}: {
  workspaceId: string;
  rows: TransactionRowData[];
  total: number;
  page: number;
  pageSize: number;
  uncategorizedCount: number;
  accounts: { id: string; name: string }[];
  categories: CategoryOption[];
  filters: { q: string; account: string; category: string; filter: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  function pushFilters(next: Partial<typeof filters> & { page?: number }) {
    const merged = { ...filters, q: search, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.account) params.set("account", merged.account);
    if (merged.category) params.set("category", merged.category);
    if (merged.filter) params.set("filter", merged.filter);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const qs = params.toString();
    router.push(`/w/${workspaceId}/transactions${qs ? `?${qs}` : ""}`);
  }

  const uncategorizedActive = filters.filter === "uncategorized";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeading>Transactions</PageHeading>
        {uncategorizedCount > 0 && (
          <button
            type="button"
            onClick={() => pushFilters({ filter: uncategorizedActive ? "" : "uncategorized", page: 1 })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              uncategorizedActive
                ? "border-debit bg-debit/10 text-debit"
                : "border-rule bg-surface text-muted hover:border-dim hover:text-ink",
            )}
          >
            Uncategorized ({uncategorizedCount})
          </button>
        )}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          pushFilters({ page: 1 });
        }}
      >
        <Input
          aria-label="Search transactions"
          placeholder="Search description or merchant…"
          className="w-auto min-w-[14rem] flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Filter by account"
          className="w-auto"
          value={filters.account}
          onChange={(e) => pushFilters({ account: e.target.value, page: 1 })}
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          className="w-auto"
          value={filters.category}
          onChange={(e) => pushFilters({ category: e.target.value, page: 1 })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={total === 0 && !filters.q && !filters.account && !filters.category && !uncategorizedActive
            ? "No transactions yet"
            : "Nothing matches"}
          description={
            total === 0 && !filters.q && !filters.account && !filters.category && !uncategorizedActive
              ? "Add one from the Accounts & bills page, or import a CSV from your bank."
              : "Try a different search or clear the filters."
          }
          action={
            <Link href={`/w/${workspaceId}/import`} className={navCls}>
              Import CSV
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <TransactionRow key={r.id} workspaceId={workspaceId} row={r} categories={categories} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {lastPage} · {total} transactions
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button type="button" className={navCls} onClick={() => pushFilters({ page: page - 1 })}>
                ← Prev
              </button>
            )}
            {page < lastPage && (
              <button type="button" className={navCls} onClick={() => pushFilters({ page: page + 1 })}>
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
