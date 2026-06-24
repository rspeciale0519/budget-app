import Link from "next/link";

const ITEMS: [string, string][] = [
  ["Dashboard", ""],
  ["Manage", "/manage"],
  ["Calendar", "/calendar"],
  ["Budget", "/budget"],
  ["Income", "/income"],
  ["Import", "/import"],
  ["Audit", "/audit"],
];

export function WorkspaceSubNav({ workspaceId }: { workspaceId: string }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 text-[13px]">
      {ITEMS.map(([label, sub]) => (
        <Link
          key={label}
          href={`/w/${workspaceId}${sub}`}
          className="rounded-md px-2.5 py-1 font-semibold text-muted transition-colors hover:bg-[#f3f5f8] hover:text-ink focus-visible:outline-none focus-visible:bg-[#f3f5f8] focus-visible:text-ink focus-visible:ring-2 focus-visible:ring-[#2563eb]/30"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
