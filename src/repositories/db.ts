import type { Prisma } from "@prisma/client";

// A DB handle usable by repositories: a full PrismaClient (admin) or an
// interactive transaction client (rlsClientFor) are both assignable here.
export type Db = Prisma.TransactionClient;
