import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Removes the disposable verify@ledger.test user and the org/workspace its
// first-run bootstrap created. Scoped strictly to that user's id.
const prismaAdmin = new PrismaClient({ datasourceUrl: process.env.CLEAN_URL });
const testId = process.env.TEST_USER_ID!;

async function main() {
  const orgMems = await prismaAdmin.orgMembership.findMany({ where: { userId: testId } });
  const orgIds = [...new Set(orgMems.map((m) => m.organizationId))];
  const workspaces = await prismaAdmin.workspace.findMany({ where: { organizationId: { in: orgIds } } });
  const wsIds = workspaces.map((w) => w.id);

  await prismaAdmin.workspaceMembership.deleteMany({ where: { workspaceId: { in: wsIds } } });
  await prismaAdmin.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prismaAdmin.orgMembership.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prismaAdmin.organization.deleteMany({ where: { id: { in: orgIds } } });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await admin.auth.admin.deleteUser(testId);

  const remaining = {
    orgs: await prismaAdmin.organization.count(),
    workspaces: await prismaAdmin.workspace.count(),
    orgMemberships: await prismaAdmin.orgMembership.count(),
    workspaceMemberships: await prismaAdmin.workspaceMembership.count(),
  };
  console.log(JSON.stringify({ deletedOrgIds: orgIds, deletedWsIds: wsIds, authDeleteError: error?.message ?? null, remaining }));
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
