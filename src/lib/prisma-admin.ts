import { PrismaClient } from "@prisma/client";

// Privileged client on DIRECT_URL (the `postgres` role, which has BYPASSRLS).
// Use ONLY for operations that legitimately bypass per-user scoping: the seed,
// org bootstrap, and membership/invite writes. Never for normal app reads.
const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined;
};

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin ??
  new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin;
}
