import Link from "next/link";
import { Dashboard } from "@/components/dashboard/dashboard";
import { mockDashboard } from "@/lib/mock/dashboard";
import { getCurrentUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/services/workspace-service";
import { listAccounts } from "@/services/account-service";

export const dynamic = "force-dynamic";

const PERIODS = ["Week", "Month", "Quarter", "Year"];

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  let name = "Workspace";
  let type = "";
  let color = "#16a34a";
  let accountCount = 0;
  if (user) {
    try {
      const ws = await getWorkspace(user.id, workspaceId);
      if (ws) {
        name = ws.name;
        type = ws.type;
        color = ws.color;
        accountCount = (await listAccounts(user.id, workspaceId)).length;
      }
    } catch {
      // Not a member — still render the mock dashboard in Phase 1.
    }
  }
  const subtitle = [
    type ? type[0]?.toUpperCase() + type.slice(1) : null,
    `${accountCount} ${accountCount === 1 ? "account" : "accounts"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* Workspace header */}
      <div className="my-[22px] flex items-center gap-3">
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-[10px] font-extrabold text-white"
          style={{ background: color }}
        >
          {name[0]?.toUpperCase() ?? "W"}
        </div>
        <div>
          <div className="text-xl font-bold text-ink">{name}</div>
          <div className="text-[12.5px] text-muted">
            {subtitle} · <span className="text-muted">mock data · live in Phase 2</span>
          </div>
        </div>
        <div className="ml-auto flex overflow-hidden rounded-[9px] border border-line bg-white">
          {PERIODS.map((p) => (
            <span
              key={p}
              className={`cursor-default px-3 py-[7px] text-[12.5px] font-semibold ${
                p === "Month" ? "bg-pos text-white" : "text-muted"
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Secondary nav */}
      <nav className="mb-4 flex gap-1 text-[13px]">
        {[
          ["Dashboard", ""],
          ["Manage", "/manage"],
          ["Import", "/import"],
          ["Audit", "/audit"],
        ].map(([label, sub]) => (
          <Link
            key={label}
            href={`/w/${workspaceId}${sub}`}
            className="rounded-md px-2.5 py-1 font-semibold text-muted hover:bg-[#f3f5f8] hover:text-ink"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Dashboard data={mockDashboard} />
    </div>
  );
}
