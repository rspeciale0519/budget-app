import type { PaneSummary } from "@/services/dashboard/pane-summary";

const STATUS: Record<PaneSummary["topBills"][number]["status"], string> = {
  overdue: "text-[#b91c1c]",
  soon: "text-[#b45309]",
  scheduled: "text-[#4338ca]",
};

export function PaneCard({ summary }: { summary: PaneSummary }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-line bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[12.5px] font-bold text-ink">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: summary.color }} aria-hidden />
        {summary.name}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex gap-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.03em] text-muted">Balance</div>
            <div className="tabular text-base font-extrabold text-ink">{summary.balance}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.03em] text-muted">Safe to spend</div>
            <div className="tabular text-base font-extrabold text-[#15803d]">{summary.safeToSpend}</div>
          </div>
        </div>
        <div className="space-y-1">
          {summary.topBills.length === 0 ? (
            <p className="text-xs text-muted">No upcoming bills</p>
          ) : (
            summary.topBills.map((b, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-700">
                  {b.vendor} <span className={`text-[10px] font-semibold ${STATUS[b.status]}`}>{b.status}</span>
                </span>
                <span className="tabular text-slate-900">{b.amount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PanePlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-[12px] border border-dashed border-line bg-card text-sm text-muted">
      Loading…
    </div>
  );
}
