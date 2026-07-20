import { afterEach, describe, expect, it } from "vitest";
import { resolveServiceUserId } from "@/lib/api/auth";

const TOKEN = "svc-token-1234567890";
const USER = "11111111-1111-1111-1111-111111111111";

afterEach(() => {
  delete process.env.API_SERVICE_TOKEN;
  delete process.env.API_SERVICE_USER_ID;
});

describe("resolveServiceUserId", () => {
  it("resolves the mapped user for the exact configured token", () => {
    process.env.API_SERVICE_TOKEN = TOKEN;
    process.env.API_SERVICE_USER_ID = USER;
    expect(resolveServiceUserId(`Bearer ${TOKEN}`)).toBe(USER);
  });

  it("rejects a wrong token of the same length", () => {
    process.env.API_SERVICE_TOKEN = TOKEN;
    process.env.API_SERVICE_USER_ID = USER;
    expect(resolveServiceUserId(`Bearer svc-token-1234567891`)).toBeNull();
  });

  it("rejects a token of different length without throwing", () => {
    process.env.API_SERVICE_TOKEN = TOKEN;
    process.env.API_SERVICE_USER_ID = USER;
    expect(resolveServiceUserId("Bearer short")).toBeNull();
  });

  it("rejects everything when no token is configured", () => {
    expect(resolveServiceUserId(`Bearer ${TOKEN}`)).toBeNull();
  });

  it("rejects a missing/non-Bearer header", () => {
    process.env.API_SERVICE_TOKEN = TOKEN;
    expect(resolveServiceUserId(null)).toBeNull();
    expect(resolveServiceUserId(`Basic ${TOKEN}`)).toBeNull();
  });

  it("uses a constant-time comparison (timingSafeEqual)", async () => {
    const source = (await import("node:fs")).readFileSync("src/lib/api/auth.ts", "utf8");
    expect(source).toContain("timingSafeEqual");
    expect(source).not.toMatch(/token\s*===\s*expected/);
  });
});
