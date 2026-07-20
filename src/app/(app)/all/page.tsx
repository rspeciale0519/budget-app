import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPrimaryOrgMembership } from "@/services/authz";
import { rollup } from "@/services/dashboard/rollup";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { TimeGreeting } from "@/components/dashboard/time-greeting";
import { format, isNegative, sub, money, compare } from "@/lib/money";
import { today as todayFn } from "@/lib/calendar-date";

export const dynamic = "force-dynamic";

export const metadata = { title: "All books" };

function Money({ value }: { value: import("@/lib/money").Money }) {
  return <span className={`tabular ${isNegative(value) ? "text-debit" : ""}`}>{format(value)}</span>;
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      <div className={`tabular mt-2 text-[26px] font-semibold leading-none ${alert ? "text-alert" : "text-ink"}`}>
        {value}
      </div>
    </Card>
  );
}

export default async function AllWorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await getUserPrimaryOrgMembership(user.id);
  if (!membership) redirect("/");

  const data = await rollup(user.id, membership.organizationId, "month", todayFn());
  const kept = sub(data.combined.in, data.combined.out);
  const showInsight = compare(data.combined.in, money(0)) > 0;

  return (
    <div className="space-y-4">
      <div>
        <PageHeading>All books</PageHeading>
        <TimeGreeting />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total balance" value={format(data.combined.balance)} />
        <Stat label="Money in · this month" value={format(data.combined.in)} />
        <Stat label="Money out · this month" value={format(data.combined.out)} />
        <Stat
          label="Bills still to pay"
          value={format(data.combined.unpaid)}
          alert={!isNegative(data.combined.unpaid) && data.combined.unpaid.toFixed(2) !== "0.00"}
        />
      </div>
      <Card className="p-4">
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.04em] text-muted">
              <th className="px-2 py-2 text-left">Book</th>
              <th className="px-2 py-2 text-right">Balance</th>
              <th className="px-2 py-2 text-right">In (this month)</th>
              <th className="px-2 py-2 text-right">Out (this month)</th>
              <th className="px-2 py-2 text-right">Unpaid</th>
              <th className="px-2 py-2 text-right" title="Money in minus money out, this month">
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.workspaceId} className="border-b border-rule hover:bg-raised/40">
                <td className="px-2 py-2.5 text-left">
                  <Link
                    href={`/w/${r.workspaceId}`}
                    className="inline-flex items-center gap-2 font-medium text-ink hover:underline"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: r.color }}
                      aria-hidden
                    />
                    {r.name}
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-right"><Money value={r.balance} /></td>
                <td className="px-2 py-2.5 text-right"><Money value={r.in} /></td>
                <td className="px-2 py-2.5 text-right"><Money value={r.out} /></td>
                <td className="px-2 py-2.5 text-right"><Money value={r.unpaid} /></td>
                <td className="px-2 py-2.5 text-right"><Money value={r.net} /></td>
              </tr>
            ))}
            <tr className="border-t-2 border-rule-strong font-extrabold text-ink">
              <td className="px-2 py-2.5 text-left">Combined</td>
              <td className="px-2 py-2.5 text-right"><Money value={data.combined.balance} /></td>
              <td className="px-2 py-2.5 text-right"><Money value={data.combined.in} /></td>
              <td className="px-2 py-2.5 text-right"><Money value={data.combined.out} /></td>
              <td className="px-2 py-2.5 text-right"><Money value={data.combined.unpaid} /></td>
              <td className="px-2 py-2.5 text-right"><Money value={data.combined.net} /></td>
            </tr>
          </tbody>
        </table>
        </div>
        {showInsight && (
          <p className="mt-3 text-sm text-ink/85">
            Across all books, you kept <b className="tabular font-semibold text-credit">{format(kept)}</b>{" "}
            of the <b className="tabular font-semibold text-ink">{format(data.combined.in)}</b> that came
            in this month.
          </p>
        )}
        <p className="mt-3 text-[11.5px] text-muted">
          <b className="font-semibold text-ink/80">Net</b> is money in minus money out this month.
          {" ↔ "}Money you pay yourself from a business, and transfers between books, are counted
          once in the combined total — not as both income and spending.
        </p>
      </Card>
    </div>
  );
}
