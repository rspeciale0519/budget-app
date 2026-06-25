import { PrismaClient } from "@prisma/client";

// One-off cloud smoke check: proves the unprivileged app_runtime role connects
// through the Supavisor transaction pooler and that the transaction-local JWT
// claim (which drives forced RLS) round-trips. Run with VERIFY_DATABASE_URL set
// to the app_runtime pooler URL.
const prisma = new PrismaClient({ datasourceUrl: process.env.VERIFY_DATABASE_URL });

async function main() {
  const idn = await prisma.$queryRawUnsafe<{ u: string; bypass: boolean }[]>(
    "SELECT current_user AS u, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass",
  );
  console.log("current_user:", idn[0]?.u, "| bypassrls:", idn[0]?.bypass);

  const noClaim = await prisma.$queryRawUnsafe<{ id: string | null }[]>(
    "SELECT app.current_user_id() AS id",
  );
  console.log("current_user_id (no claim):", noClaim[0]?.id);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "SELECT set_config('request.jwt.claims', $1, true)",
      JSON.stringify({ sub: "11111111-1111-1111-1111-111111111111" }),
    );
    const withClaim = await tx.$queryRawUnsafe<{ id: string | null }[]>(
      "SELECT app.current_user_id() AS id",
    );
    console.log("current_user_id (with claim):", withClaim[0]?.id);
  });

  console.log("VERIFY_OK");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("VERIFY_FAIL:", e.message);
    process.exit(1);
  });
