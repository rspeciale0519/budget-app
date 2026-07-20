import { PrismaClient } from "@prisma/client";

// Privileged client on ADMIN_DATABASE_URL (the app_admin role: cross-tenant
// DML via blanket admin policies, but no DDL, no other schemas, not superuser).
// Use ONLY for operations that legitimately bypass per-user scoping: the seed,
// org bootstrap, and membership/invite writes. Never for normal app reads.
const globalForPrismaAdmin = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined;
};

export const prismaAdmin =
  globalForPrismaAdmin.prismaAdmin ??
  new PrismaClient({
    datasourceUrl: process.env.ADMIN_DATABASE_URL,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaAdmin.prismaAdmin = prismaAdmin;
}
