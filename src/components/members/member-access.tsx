"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { assignAction, revokeAction } from "@/app/(app)/settings/_actions";
import type { WorkspaceRole } from "@prisma/client";

export interface MemberView {
  userId: string;
  email: string;
  orgRole: string;
  lastSignInAt: string | null;
  workspaces: { workspaceId: string; role: WorkspaceRole }[];
}

const ACCESS_OPTIONS = [
  { value: "none", label: "No access" },
  { value: "viewer", label: "Can view" },
  { value: "admin", label: "Can edit" },
] as const;

export function MemberAccessManager({
  member,
  allWorkspaces,
  isSelf,
}: {
  member: MemberView;
  allWorkspaces: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingWs, setPendingWs] = useState<string | null>(null);

  function accessFor(workspaceId: string): string {
    return member.workspaces.find((w) => w.workspaceId === workspaceId)?.role ?? "none";
  }

  async function change(workspaceId: string, value: string) {
    setPendingWs(workspaceId);
    const res =
      value === "none"
        ? await revokeAction(workspaceId, member.userId)
        : await assignAction(workspaceId, member.userId, value as WorkspaceRole);
    setPendingWs(null);
    if (res.ok) {
      toast("Access updated");
      router.refresh();
    } else {
      toast(res.error ?? "Could not update access — try again.", { kind: "error" });
    }
  }

  return (
    <div className="space-y-2 border-b border-rule py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink">{member.email}</span>
        {isSelf && (
          <span className="rounded-full bg-now-tint px-2 py-0.5 text-[11px] font-semibold text-now">
            You
          </span>
        )}
        {!isSelf && member.lastSignInAt === null && (
          <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted">
            Invited — hasn&apos;t signed in yet
          </span>
        )}
        <span className="text-xs text-muted">{member.orgRole}</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {allWorkspaces.map((ws) => (
          <div key={ws.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-ink/85">{ws.name}</span>
            {isSelf ? (
              <span className="text-xs text-muted">
                {ACCESS_OPTIONS.find((o) => o.value === accessFor(ws.id))?.label ?? "No access"}
              </span>
            ) : (
              <Select
                aria-label={`${member.email} access to ${ws.name}`}
                className="h-8 w-auto min-w-[7.5rem] text-xs"
                value={accessFor(ws.id)}
                disabled={pendingWs === ws.id}
                onChange={(e) => change(ws.id, e.target.value)}
              >
                {ACCESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
