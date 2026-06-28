import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prismaAdmin } from "@/lib/prisma-admin";
import { listMembers } from "@/services/membership-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteForm } from "@/components/members/invite-form";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orgMembership = await prismaAdmin.orgMembership.findFirst({ where: { userId: user.id } });
  if (!orgMembership) redirect("/");

  let members: { userId: string; role: string }[] = [];
  let canManage = true;
  try {
    members = (await listMembers(user.id, orgMembership.organizationId)).map((m) => ({
      userId: m.userId,
      role: m.role,
    }));
  } catch {
    canManage = false;
  }

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
              <p className="mt-2 text-xs text-muted">
                Invited teammates get no access until you grant them a workspace.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Organization members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {members.map((m) => (
                <div key={m.userId} className="flex justify-between border-b border-line py-1">
                  <span className="font-mono text-xs text-muted">{m.userId}</span>
                  <span className="text-ink">{m.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted">Only an organization owner or admin can manage members.</p>
      )}
    </div>
  );
}
