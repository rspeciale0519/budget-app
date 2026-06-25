import { PrismaClient } from "@prisma/client";

const p = new PrismaClient({ datasourceUrl: process.env.CHECK_URL });
p.$queryRawUnsafe(
  "SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN ('postgres','app_runtime','authenticator','service_role','supabase_admin')",
)
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
