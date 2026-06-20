import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { rlsClientFor } from "@/lib/prisma-rls";

const USER = "11111111-1111-1111-1111-111111111111";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("rlsClientFor", () => {
  it("sets the request claim transaction-locally so RLS can read the user", async () => {
    const id = await rlsClientFor(USER).run(async (tx) => {
      const rows = await tx.$queryRawUnsafe<{ id: string | null }[]>(
        "SELECT app.current_user_id() AS id",
      );
      return rows[0]?.id ?? null;
    });
    expect(id).toBe(USER);
  });

  it("yields no current user on a bare (claimless) connection", async () => {
    // Transaction-local set_config never persists; a claimless connection
    // resolves to no user (so RLS will deny every row).
    const rows = await prisma.$queryRawUnsafe<{ id: string | null }[]>(
      "SELECT app.current_user_id() AS id",
    );
    expect(rows[0]?.id ?? null).toBeNull();
  });

  it("runs as the unprivileged app_runtime role (no BYPASSRLS)", async () => {
    const rows = await prisma.$queryRawUnsafe<{ u: string; bypass: boolean }[]>(
      "SELECT current_user AS u, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user",
    );
    expect(rows[0]?.u).toBe("app_runtime");
    expect(rows[0]?.bypass).toBe(false);
  });
});
