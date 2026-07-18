import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listMembersWithDetails } from "@/services/membership-service";
import { listAccessibleWorkspaces } from "@/services/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteForm } from "@/components/members/invite-form";
import { MemberAccessManager, type MemberView } from "@/components/members/member-access";

export const dynamic = "force-dynamic";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orgMembership = await prismaAdmin.orgMembership.findFirst({ where: { userId: user.id } });
  if (!orgMembership) redirect("/");

  let members: MemberView[] = [];
  let canManage = true;
  try {
    members = await listMembersWithDetails(user.id, orgMembership.organizationId);
  } catch {
    canManage = false;
  }
  const workspaces = (await listAccessibleWorkspaces(user.id))
    .filter((w) => w.organizationId === orgMembership.organizationId)
    .map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Members</h1>
      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invite a teammate</CardTitle>
            </CardHeader>
            <CardContent>
              <InviteForm organizationId={orgMembership.organizationId} />
              <p className="mt-2 text-xs text-dim">
                After inviting someone, choose below which workspaces they can see or edit.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
            </CardHeader>
            <CardContent>
              {members.map((m) => (
                <MemberAccessManager
                  key={m.userId}
                  member={m}
                  allWorkspaces={workspaces}
                  isSelf={m.userId === user.id}
                />
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted">Only an owner or admin can manage members.</p>
      )}
    </div>
  );
}
