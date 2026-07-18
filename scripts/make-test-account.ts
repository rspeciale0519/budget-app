import { PrismaClient } from "@prisma/client";

// Creates a throwaway account in a workspace for import smoke-testing.
const p = new PrismaClient({ datasourceUrl: process.env.CLEAN_URL });

async function main() {
  const acct = await p.account.create({
    data: {
      workspaceId: process.env.WS_ID!,
      name: "Test Checking (delete me)",
      type: "checking",
      institution: "Test Bank",
      openingBalance: "2000.00",
      openingDate: new Date("2026-06-01T00:00:00Z"),
      currency: "USD",
    },
  });
  console.log("ACCOUNT_ID=" + acct.id);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
