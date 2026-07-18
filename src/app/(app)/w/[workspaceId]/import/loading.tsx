// Neutral skeleton for this tab — a header line and one card-shaped shimmer.
// (The dashboard route keeps its richer, dashboard-shaped skeleton.)

export default function TabLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-6 w-48 rounded bg-raised" />
      <div className="rounded-card border border-rule bg-surface p-4 shadow-card">
        <div className="h-4 w-40 rounded bg-raised" />
        <div className="mt-4 h-3 w-full rounded bg-raised" />
        <div className="mt-2.5 h-3 w-2/3 rounded bg-raised" />
        <div className="mt-2.5 h-3 w-1/2 rounded bg-raised" />
      </div>
    </div>
  );
}