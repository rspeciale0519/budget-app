// Shown in the content area (below the persistent workspace header + sub-nav)
// while a tab's server work runs — the dashboard is heavy, so this keeps
// navigation from feeling frozen. Mirrors the dashboard's shape.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-raised ${className}`} />;
}

function CardSkeleton({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-card border border-rule bg-surface p-4 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export default function WorkspaceLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      {/* period selector placeholder */}
      <div className="flex justify-end">
        <Bar className="h-8 w-56" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i}>
            <Bar className="h-3 w-24" />
            <Bar className="mt-3 h-7 w-28" />
            <Bar className="mt-3 h-3 w-20" />
          </CardSkeleton>
        ))}
      </div>

      {/* two-column main */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <CardSkeleton>
            <Bar className="h-4 w-40" />
            <Bar className="mt-5 h-40 w-full" />
          </CardSkeleton>
          <CardSkeleton>
            <Bar className="h-4 w-44" />
            <Bar className="mt-5 h-32 w-full" />
          </CardSkeleton>
        </div>
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i}>
              <Bar className="h-4 w-36" />
              <Bar className="mt-4 h-3 w-full" />
              <Bar className="mt-2.5 h-3 w-2/3" />
            </CardSkeleton>
          ))}
        </div>
      </div>
    </div>
  );
}
