import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RlsTx = Prisma.TransactionClient;

/**
 * The ONLY sanctioned way to issue RLS-scoped queries. Every operation runs
 * inside a transaction whose first statement sets the request's JWT claim
 * (transaction-local, so it cannot leak across pooled connections). The
 * runtime connects as the unprivileged `app_runtime` role, so Postgres RLS
 * (Task 11) physically constrains every read/write to the user's workspaces.
 */
export function rlsClientFor(userId: string) {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  return {
    run<T>(fn: (tx: RlsTx) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT set_config('request.jwt.claims', $1, true)", claims);
        return fn(tx);
      });
    },
  };
}

export type RlsClient = ReturnType<typeof rlsClientFor>;
