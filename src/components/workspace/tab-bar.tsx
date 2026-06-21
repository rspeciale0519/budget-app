import Link from "next/link";
import { listAccessibleWorkspaces } from "@/services/authz";

export async function TabBar({ userId }: { userId: string }) {
  const workspaces = await listAccessibleWorkspaces(userId);
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
        {workspaces.map((w) => (
          <Link
            key={w.id}
            href={`/w/${w.id}`}
            className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: w.color }}
              aria-hidden
            />
            {w.icon ? <span aria-hidden>{w.icon}</span> : null}
            {w.name}
          </Link>
        ))}
        <Link
          href="/all"
          className="ml-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          All Workspaces
        </Link>
      </div>
    </nav>
  );
}
