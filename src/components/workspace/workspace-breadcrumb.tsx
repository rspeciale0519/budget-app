"use client";

import { usePathname } from "next/navigation";
import { WORKSPACE_SECTIONS } from "@/components/workspace/workspace-sub-nav";

/** "› Section" after the workspace name, so a deep page (e.g. Budget) still
 * reads as "you are here" even after scrolling past the sub-nav tabs. */
export function WorkspaceBreadcrumb({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const base = `/w/${workspaceId}`;
  const section = WORKSPACE_SECTIONS.find(([, sub]) =>
    sub === "" ? pathname === base : pathname.startsWith(`${base}${sub}`),
  );
  if (!section || section[1] === "") return null;
  return (
    <span className="text-xs font-medium uppercase tracking-[0.06em] text-dim">
      {" "}
      › {section[0]}
    </span>
  );
}
