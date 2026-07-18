import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { rollup } from "@/services/dashboard/rollup";
import { Card } from "@/components/ui/card";
import { format, isNegative } from "@/lib/money";
import { today as todayFn } from "@/lib/calendar-date";

export const dynamic = "force-dynamic";

export const metadata = { title: "All workspaces" };

function Money({ value }: { value: import("@/lib/money").Money }) {
  return <span className={`tabular ${isNegative(value) ? "text-debit" : ""}`}>{format(value)}</span>;
}

export default async function AllWorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await prismaAdmin.orgMembership.findFirst({ where: { userId: user.id } });
  if (!membership) redirect("/");

  const data = await rollup(user.id, membership.organizationId, "month", todayFn());

  return (
    <div className="space-y-4">
      <h1 className="my-[22px] text-xl font-bold text-ink">All Workspaces</h1>
      <Card className="p-4">
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.04em] text-muted">
              <th className="px-2 py-2 text-left">Workspace</th>
              <th className="px-2 py-2 text-right">Balance</th>
              <th className="px-2 py-2 text-right">In (MTD)</th>
              <th className="px-2 py-2 text-right">Out (MTD)</th>
              <th className="px-2 py-2 text-right">Unpaid</th>
              <th className="px-2 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.workspaceId} className="border-b border-rule">
                <td className="px-2 py-2.5 text-left text-ink/85">{r.name}</td>
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
        <p className="mt-3 text-[11.5px] text-muted">
          ↔ Owner draws / inter-workspace transfers are recognized inside each workspace but netted
          out of the combined In/Out total so they aren&apos;t double-counted as income.
        </p>
      </Card>
    </div>
  );
}
