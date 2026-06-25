import { PrismaClient } from "@prisma/client";

const p = new PrismaClient({ datasourceUrl: process.env.CHECK_URL });

async function main() {
  const orgs = await p.organization.count();
  const ws = await p.workspace.count();
  const orgm = await p.orgMembership.count();
  const wsm = await p.workspaceMembership.count();
  console.log(JSON.stringify({ organizations: orgs, workspaces: ws, orgMemberships: orgm, workspaceMemberships: wsm }));
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
