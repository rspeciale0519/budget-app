import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prismaAdmin } from "@/lib/prisma-admin";

// Live test: requires local Supabase running and ADMIN_DATABASE_URL in .env.
// Verifies the runtime privileged client connects as the least-privilege
// app_admin role — able to cross tenants for legitimate admin duties, but
// unable to run DDL or reach other schemas (incl. auth).

// Cleanup uses a separate postgres (DIRECT_URL) connection so the DDL probe
// never leaves a stray table behind, even on a pre-fix run where the client
// is still connected as the superuser postgres role.
afterAll(async () => {
  const root = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  try {
    await root.$executeRawUnsafe('DROP TABLE IF EXISTS "_priv_probe"');
  } finally {
    await root.$disconnect();
  }
  await prismaAdmin.$disconnect();
});

describe("app_admin role least-privilege", () => {
  it("connects as app_admin, not postgres", async () => {
    const rows = await prismaAdmin.$queryRawUnsafe<{ current_user: string }[]>(
      "SELECT current_user",
    );
    expect(rows[0]?.current_user).toBe("app_admin");
  });

  it("can read across workspaces (admin duties still work)", async () => {
    await expect(prismaAdmin.workspaceMembership.findMany({ take: 1 })).resolves.toBeDefined();
  });

  it("cannot run DDL", async () => {
    await expect(
      prismaAdmin.$executeRawUnsafe('CREATE TABLE "_priv_probe" (id int)'),
    ).rejects.toThrow(/permission denied/i);
  });

  it("cannot read the auth schema", async () => {
    await expect(
      prismaAdmin.$queryRawUnsafe("SELECT id FROM auth.users LIMIT 1"),
    ).rejects.toThrow(/permission denied/i);
  });
});
