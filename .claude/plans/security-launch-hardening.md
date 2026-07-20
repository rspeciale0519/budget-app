# Security Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the pre-SaaS-launch security gaps identified in the 2026-07-20 audit: least-privilege admin DB access, timing-safe token comparison, security headers, API rate limiting, a privileged-client usage audit, and optional TOTP MFA.

**Architecture:** The app already has forced Postgres RLS (runtime role `app_runtime`) plus a service-layer authz check. This plan removes the remaining big blast-radius item — the `postgres` superuser-ish credential (`DIRECT_URL`) living in the web runtime — by introducing a non-superuser `app_admin` role that gets RLS exemption via explicit blanket policies (hosted Supabase's `postgres` role cannot mint `BYPASSRLS` roles, so `TO app_admin USING (true)` policies achieve the same effect). Around that core change we add standard web hardening (headers, rate limiting, timing-safe compares) and an audit + lint guard so `prismaAdmin` can't silently creep into normal reads.

**Tech Stack:** Next.js 16 (App Router), Prisma 6, Supabase (hosted + local), Zod 4, Vitest 3, ESLint 9 flat config (`eslint.config.mjs`).

## Global Constraints

- Branch: `security/launch-hardening` via `/git-workflow-planning:start security launch-hardening` BEFORE any code (global Rule 8). Repo is main-only; `start` will warn and branch off `main` — accept that.
- After each phase: update `docs/ROADMAP.md` (Rule 7), then `/git-workflow-planning:checkpoint <N> <desc>` (gates on `npm run type-check` + `npm run lint`).
- Test runner: `npx vitest run <file>` for single files; full suite `npm run test`.
- `*.live.test.ts` files hit the local Supabase database — local stack must be running (`supabase start`); they load env from `.env`.
- Never commit real secrets. The literal password `app_admin_local_pw` is LOCAL-ONLY (same convention as the existing committed `app_runtime_local_pw`); production password is set out-of-band (Appendix A).
- Source files ≤ ~450 LOC; follow existing file patterns; no explanatory comments beyond constraint notes.
- Money/date/tenant conventions are untouched by this plan — no schema model changes, only roles/policies/grants.

---

## Phase 1 — Small high-value code fixes (Tasks 1–3)

### Task 1: Timing-safe service-token comparison

**Files:**
- Modify: `src/lib/api/auth.ts` (currently 27 lines; `resolveServiceUserId` at lines 8–14)
- Test: create `src/lib/api/auth.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `resolveServiceUserId(authHeader: string | null): string | null` — signature unchanged; only the comparison hardens. `resolveApiUserId` untouched.

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/auth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api/auth.test.ts`
Expected: FAIL — the `timingSafeEqual` source assertion fails (and all behavior tests pass, proving no behavior change).

- [ ] **Step 3: Implement the constant-time comparison**

In `src/lib/api/auth.ts`, replace the whole `resolveServiceUserId` function and add the import + helper:

```ts
import { createHash, timingSafeEqual } from "node:crypto";
import { getCurrentUser } from "@/lib/supabase/server";

// Hash both sides to equal-length digests so timingSafeEqual never throws on
// length mismatch and comparison time is independent of the secret.
function tokensMatch(candidate: string, expected: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Resolve a scoped, read-only service token to its mapped user id. This is the
 * future-AI seam: the advisor authenticates as a configured service user whose
 * workspace memberships (and RLS) define exactly what it can read.
 */
export function resolveServiceUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const expected = process.env.API_SERVICE_TOKEN;
  if (expected && tokensMatch(token, expected)) return process.env.API_SERVICE_USER_ID ?? null;
  return null;
}
```

(`resolveApiUserId` below it stays exactly as-is.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api/auth.test.ts src/app/api/v1/workspaces/route.test.ts`
Expected: PASS (route tests confirm the API contract is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/auth.ts src/lib/api/auth.test.ts
git commit -m "security: constant-time service-token comparison"
```

### Task 2: Security headers (incl. production CSP)

**Files:**
- Modify: `next.config.ts` (currently 10 lines)
- Test: create `src/lib/security-headers.test.ts`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SUPABASE_URL` (already validated in `src/lib/env.ts`).
- Produces: `nextConfig.headers()` returning one rule for `/(.*)`. No runtime code consumes it; Next.js applies it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/security-headers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function getHeaders(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers!();
  const all = rules.find((r) => r.source === "/(.*)");
  expect(all).toBeDefined();
  return Object.fromEntries(all!.headers.map((h) => [h.key, h.value]));
}

describe("security headers", () => {
  it("sets the core protection headers on every route", async () => {
    const h = await getHeaders();
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toContain("max-age=");
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });

  it("CSP restricts framing, objects, and connect targets to self + Supabase", async () => {
    const h = await getHeaders();
    const csp = h["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/security-headers.test.ts`
Expected: FAIL — `nextConfig.headers` is undefined.

- [ ] **Step 3: Implement headers in next.config.ts**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

// CSP notes: Next.js App Router hydration needs inline scripts, so script-src
// keeps 'unsafe-inline' (nonce-based CSP is a future tightening). 'unsafe-eval'
// is dev-only (React refresh). connect-src must cover Supabase REST + realtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Lets the dev server (HMR socket + JS chunks) be reached over Tailscale,
  // e.g. for testing on a phone. Without this, Next.js silently blocks
  // /_next/* requests from any origin it doesn't recognize.
  allowedDevOrigins: ["robs-asus2.tailc1936f.ts.net", "100.74.194.24"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/security-headers.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the app still renders under CSP (browser check)**

Start dev server (reuse if already running — Rule 3), open the app with chrome-devtools MCP, load the dashboard and one workspace page, and check the console for CSP violation errors (`list_console_messages`). Expected: no `Refused to ...` CSP errors. If a legitimate resource is blocked (e.g. an external image host), add that single origin to the relevant directive and re-verify.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/lib/security-headers.test.ts
git commit -m "security: CSP + standard security headers on all routes"
```

### Task 3: Rate limiting for the public API surface

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/app/api/v1/workspaces/route.ts`
- Test: create `src/lib/rate-limit.test.ts`; extend `src/app/api/v1/workspaces/route.test.ts`

**Interfaces:**
- Produces: `rateLimit(key: string, opts: { limit: number; windowMs: number }, now?: number): boolean` (true = allowed) and `resetRateLimits(): void` (test helper). Route returns HTTP 429 with `{ error: "Too many requests" }` when exceeded.
- Known limitation (documented, accepted): in-memory fixed window is per-server-instance. On Vercel Fluid Compute instances persist across requests so this meaningfully throttles token guessing, but platform-level limits (Vercel WAF — Appendix A) remain the durable backstop.

- [ ] **Step 1: Write the failing limiter test**

Create `src/lib/rate-limit.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const OPTS = { limit: 3, windowMs: 60_000 };

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", OPTS, t0)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 1)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 2)).toBe(true);
    expect(rateLimit("k", OPTS, t0 + 3)).toBe(false);
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k", OPTS, t0 + i);
    expect(rateLimit("k", OPTS, t0 + 5)).toBe(false);
    expect(rateLimit("k", OPTS, t0 + 60_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("a", OPTS, t0 + i);
    expect(rateLimit("a", OPTS, t0 + 4)).toBe(false);
    expect(rateLimit("b", OPTS, t0 + 4)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the limiter**

Create `src/lib/rate-limit.ts`:

```ts
// Fixed-window in-memory limiter. Per-instance only — the durable backstop is
// platform-level (Vercel WAF); this throttles brute-force within an instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now: number = Date.now(),
): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (bucket.count >= opts.limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route test**

`src/app/api/v1/workspaces/route.test.ts` is a live test (needs local Supabase; it already imports `GET` from `@/app/api/v1/workspaces/route` at line 4 and sets `API_SERVICE_TOKEN` in `beforeAll`). Add the import and a new test inside the existing `describe("GET /api/v1/workspaces")`:

```ts
import { resetRateLimits } from "@/lib/rate-limit";
```

```ts
  it("returns 429 after 60 requests from one IP in a minute", async () => {
    resetRateLimits();
    const make = () =>
      GET(
        new Request("http://localhost/api/v1/workspaces", {
          headers: { "x-forwarded-for": "203.0.113.9", authorization: "Bearer wrong" },
        }),
      );
    let last: Response | undefined;
    for (let i = 0; i < 61; i++) last = await make();
    expect(last!.status).toBe(429);
    resetRateLimits();
  });
```

(The existing three tests send no `x-forwarded-for`, so they fall in the separate `"unknown"` bucket and stay far below the limit; the trailing `resetRateLimits()` keeps it that way regardless of test order.)

- [ ] **Step 6: Run to verify it fails, then wire the limiter into the route**

Run: `npx vitest run src/app/api/v1/workspaces/route.test.ts` → the new test FAILS (status is 401, not 429).

In `src/app/api/v1/workspaces/route.ts` (handler `GET` starts at line 8; the file already imports `jsonError` from `@/lib/api/respond`), add the import and the guard as the first statements of `GET`, before `resolveApiUserId`:

```ts
import { rateLimit } from "@/lib/rate-limit";
```

```ts
export async function GET(request: Request): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`api:${ip}`, { limit: 60, windowMs: 60_000 })) {
    return jsonError(429, "Too many requests");
  }
  const userId = await resolveApiUserId(request);
  // ... rest unchanged
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/lib/rate-limit.test.ts src/app/api/v1/workspaces/route.test.ts`
Expected: PASS.

- [ ] **Step 8: Phase 1 checkpoint**

Mark Phase 1 items done in `docs/ROADMAP.md` (add a "Security launch hardening" section if none exists), then:

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts src/app/api/v1/workspaces/route.ts src/app/api/v1/workspaces/route.test.ts docs/ROADMAP.md
```

Run `/git-workflow-planning:checkpoint 1 "timing-safe token, security headers, API rate limiting"`.

---

## Phase 2 — Least-privilege admin database role (Task 4)

### Task 4: Replace runtime use of `postgres`/`DIRECT_URL` with a non-superuser `app_admin` role

**Files:**
- Create: `prisma/migrations/<generated>_security_admin_role/migration.sql` (via `prisma migrate dev --create-only`)
- Modify: `src/lib/prisma-admin.ts` (line 13: `datasourceUrl`)
- Modify: `src/lib/env.ts` (replace `DIRECT_URL` with `ADMIN_DATABASE_URL` in the runtime schema)
- Modify: `.env` (local, uncommitted): add `ADMIN_DATABASE_URL`; keep `DIRECT_URL` (still used by Prisma CLI for migrations and by `prisma/seed.ts`)
- Test: create `src/services/admin-role.live.test.ts`

**Interfaces:**
- Consumes: existing `app` schema + `app.current_user_id()` from migration `20260620222249_security_runtime_role`.
- Produces: env var **`ADMIN_DATABASE_URL`** (connection string for role `app_admin`); `prismaAdmin` behavior is unchanged from callers' perspective (cross-tenant reads/writes still work — via blanket policies instead of `BYPASSRLS`).
- Design constraint (why not `BYPASSRLS`): on hosted Supabase the `postgres` role is not a superuser and cannot create `BYPASSRLS` roles. Equivalent effect: `CREATE POLICY ... FOR ALL TO app_admin USING (true) WITH CHECK (true)` on every table (policies are permissive/OR'd, so this doesn't widen `app_runtime`).
- Follow-up rule for future migrations: any new table needs BOTH its tenant policy AND an `admin_all_*` policy (note this in the migration header comment).

- [ ] **Step 1: Write the failing live test**

Create `src/services/admin-role.live.test.ts` (mirror the env/setup conventions of `src/services/security.rls.test.ts` — read that file first and copy its bootstrapping):

```ts
import { describe, expect, it } from "vitest";
import { prismaAdmin } from "@/lib/prisma-admin";

// Live test: requires local Supabase running and ADMIN_DATABASE_URL in .env.
describe("app_admin role least-privilege", () => {
  it("connects as app_admin, not postgres", async () => {
    const rows = await prismaAdmin.$queryRawUnsafe<{ current_user: string }[]>(
      "SELECT current_user",
    );
    expect(rows[0].current_user).toBe("app_admin");
  });

  it("can read across workspaces (admin duties still work)", async () => {
    await expect(prismaAdmin.workspaceMembership.findMany({ take: 1 })).resolves.toBeDefined();
  });

  it("cannot run DDL", async () => {
    await expect(
      prismaAdmin.$executeRawUnsafe("CREATE TABLE _priv_probe (id int)"),
    ).rejects.toThrow(/permission denied/i);
  });

  it("cannot read the auth schema", async () => {
    await expect(
      prismaAdmin.$queryRawUnsafe("SELECT id FROM auth.users LIMIT 1"),
    ).rejects.toThrow(/permission denied/i);
  });
});
```

- [ ] **Step 2: Run to verify current state fails the right way**

Run: `npx vitest run src/services/admin-role.live.test.ts`
Expected: FAIL — `current_user` is `postgres`, and the DDL/auth-schema tests FAIL too (postgres can do both). This proves the test detects the vulnerability.

- [ ] **Step 3: Create the migration**

Run: `npx prisma migrate dev --create-only --name security_admin_role`
Then replace the generated `migration.sql` content with:

```sql
-- Least-privilege admin role (security launch hardening). app_admin replaces
-- the postgres role for the runtime prismaAdmin client: it can DML every app
-- table across tenants (blanket policies below) but cannot ALTER/DROP/CREATE
-- objects, create roles, or touch other schemas (incl. auth).
--
-- Why policies instead of BYPASSRLS: hosted Supabase's postgres role is not a
-- superuser and cannot create BYPASSRLS roles. Permissive policies are OR'd,
-- so these do not widen app_runtime's access.
--
-- MAINTENANCE RULE: every future table migration must add BOTH the tenant
-- policy AND an admin_all_<table> policy like the ones below.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin LOGIN PASSWORD 'app_admin_local_pw'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_admin;
GRANT USAGE ON SCHEMA app TO app_admin;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_admin;

CREATE POLICY admin_all_organization ON "Organization" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_org_membership ON "OrgMembership" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace ON "Workspace" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace_membership ON "WorkspaceMembership" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_account ON "Account" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_category ON "Category" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_import_batch ON "ImportBatch" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_transaction ON "Transaction" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_bill ON "Bill" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_recurring_schedule ON "RecurringSchedule" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_income_source ON "IncomeSource" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_debt ON "Debt" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_goal ON "Goal" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_workspace_transfer ON "WorkspaceTransfer" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_import_mapping ON "ImportMapping" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_category_rule ON "CategoryRule" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_budget ON "Budget" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_layout ON "Layout" FOR ALL TO app_admin USING (true) WITH CHECK (true);
CREATE POLICY admin_all_audit_log ON "AuditLog" FOR ALL TO app_admin USING (true) WITH CHECK (true);
```

Apply: `npx prisma migrate dev`
Expected: migration applies cleanly.

- [ ] **Step 4: Point prismaAdmin at the new role**

In `src/lib/prisma-admin.ts`, change line 13 and the header comment:

```ts
// Privileged client on ADMIN_DATABASE_URL (the app_admin role: cross-tenant
// DML via blanket policies, but no DDL, no other schemas, not superuser).
// Use ONLY for operations that legitimately bypass per-user scoping: the seed,
// org bootstrap, and membership/invite writes. Never for normal app reads.
```

```ts
    datasourceUrl: process.env.ADMIN_DATABASE_URL,
```

In `src/lib/env.ts`, replace the `DIRECT_URL` line with:

```ts
  ADMIN_DATABASE_URL: z.string().url(),
```

(`DIRECT_URL` stays in `.env` for the Prisma CLI and `prisma/seed.ts`, but is no longer part of the app's validated runtime environment.)

In local `.env`, add (derive host/port from the existing `DATABASE_URL` for `app_runtime` — same instance, different credentials):

```
ADMIN_DATABASE_URL="postgresql://app_admin:app_admin_local_pw@<same-host>:<same-port>/postgres"
```

- [ ] **Step 5: Run the live test + full suite**

Run: `npx vitest run src/services/admin-role.live.test.ts`
Expected: PASS (all four tests).

Run: `npm run test`
Expected: PASS — every existing prismaAdmin-dependent test (membership, workspace bootstrap, `security.rls.test.ts`, live tests) still passes, proving the blanket policies fully substitute for postgres's implicit bypass. If any test fails with a permission error, the fix is a missing GRANT or policy in the migration — do NOT widen the role attributes.

- [ ] **Step 6: Phase 2 checkpoint**

Update `docs/ROADMAP.md`, then `/git-workflow-planning:checkpoint 2 "least-privilege app_admin role replaces postgres in runtime"`.

Note in the checkpoint output for later (Appendix A): production still needs the role's real password + Vercel env swap before deploy.

---

## Phase 3 — prismaAdmin usage audit + lint guard (Task 5)

### Task 5: Audit every non-test `prismaAdmin` consumer; add an ESLint fence

**Files (audit targets — every current non-test importer):**
- `src/services/authz.ts` — expected: sanctioned (authz must not depend on RLS)
- `src/services/membership-service.ts` — expected: sanctioned (bootstrap/invites/email lookups)
- `src/services/workspace-service.ts`
- `src/services/recurring-service.ts`
- `src/services/dashboard/planning.ts`
- `src/app/(app)/tiles/page.tsx`
- `src/app/(app)/tiles/_actions.ts`
- `src/app/(app)/settings/members/page.tsx`
- `src/app/(app)/all/page.tsx`
- `src/components/workspace/tab-bar.tsx`
- Modify: `eslint.config.mjs` (add `no-restricted-imports` fence)

**Audit criterion (apply to each file):** a `prismaAdmin` call is legitimate ONLY if it is (a) a membership/authz read that must not depend on RLS, (b) org/user bootstrap or invite writes, or (c) a cross-workspace aggregation explicitly gated by `assertOrgRole(...)` in the same code path. Anything else (normal reads/writes of accounts, transactions, bills, dashboards for the current user) must go through `rlsClientFor(userId)` from `src/lib/prisma-rls.ts`.

- [ ] **Step 1: Audit each file**

For each file above: read it, classify every `prismaAdmin` usage against the criterion, and record verdict per file. For each violation, refactor to `rlsClientFor` — the pattern is:

```ts
// before
const rows = await prismaAdmin.transaction.findMany({ where: { workspaceId } });
// after
const rls = rlsClientFor(userId);
const rows = await rls.run((tx) => tx.transaction.findMany({ where: { workspaceId } }));
```

(`userId` is already available in every server action / page via `resolveApiUserId` / `getCurrentUser` — follow how each file's neighbors obtain it.) If a usage is legitimate, keep it. If a usage is genuinely system-level with no acting user (e.g. recurring-bill materialization), keep `prismaAdmin` and ensure the call site is reached only from an authenticated, workspace-authorized path (`assertWorkspaceAccess` before it).

- [ ] **Step 2: Run affected test files after each refactor**

Run: `npx vitest run <matching .test.ts / .live.test.ts files for each changed service>` then the full `npm run test`.
Expected: PASS. RLS-scoped rewrites must not change results for authorized users — a result change means the original code was leaking rows and the new result is correct; verify against `security.rls.test.ts` expectations before concluding.

- [ ] **Step 3: Add the ESLint fence**

In `eslint.config.mjs`, add a config object (after the existing entries, adjusting the `files` allowlist to the post-audit sanctioned set — the listed files are the starting point, remove any that lost their prismaAdmin usage in Step 1):

```js
{
  files: ["src/**/*.{ts,tsx}"],
  ignores: [
    "src/lib/prisma-admin.ts",
    "src/services/authz.ts",
    "src/services/membership-service.ts",
    "src/**/*.test.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@/lib/prisma-admin",
            message:
              "prismaAdmin bypasses RLS. Use rlsClientFor(userId) from @/lib/prisma-rls, or add this file to the sanctioned allowlist in eslint.config.mjs with justification.",
          },
        ],
      },
    ],
  },
},
```

Every file that legitimately keeps `prismaAdmin` after the audit gets added to `ignores` with the justification recorded in the checkpoint commit message.

- [ ] **Step 4: Verify lint catches violations, then passes**

Temporarily add `import { prismaAdmin } from "@/lib/prisma-admin";` to a non-allowlisted file, run `npm run lint`, expect an error; revert the probe. Then `npm run lint` → clean.

- [ ] **Step 5: Phase 3 checkpoint**

Update `docs/ROADMAP.md`, then `/git-workflow-planning:checkpoint 3 "prismaAdmin audit + eslint fence"`.

---

## Phase 4 — TOTP MFA (Task 6) — OPTIONAL / GATED

**Gate:** Supabase Auth MFA (TOTP) must be enabled in the hosted project's dashboard AND local `supabase/config.toml` (`[auth.mfa.totp]` → `enroll_enabled = true`, `verify_enabled = true`) before this phase runs. If you want to defer MFA to post-launch, skip this phase — Phases 1–3 stand alone.

### Task 6: TOTP enrollment (settings) + verification (login) + AAL2 enforcement (middleware)

**Files:**
- Create: `src/app/(app)/settings/security/page.tsx`
- Create: `src/components/auth/mfa-settings.tsx`
- Modify: `src/components/auth/login-form.tsx` (add post-password TOTP challenge step; password sign-in is at line 34)
- Modify: `src/middleware.ts` (enforce AAL2 when the user has a verified factor)

**Interfaces:**
- Consumes: `supabase.auth.mfa.enroll / challenge / verify / unenroll / listFactors / getAuthenticatorAssuranceLevel` from `@supabase/supabase-js` (browser client from `src/lib/supabase/client.ts`).
- Produces: no new exports consumed elsewhere; enforcement is middleware-level.

- [ ] **Step 1: Middleware AAL2 enforcement**

In `src/middleware.ts`, after the `getUser()` call and before the redirect logic, add:

```ts
if (user && !isLogin) {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("mfa", "1");
    return NextResponse.redirect(url);
  }
}
```

- [ ] **Step 2: Login challenge step**

`src/components/auth/login-form.tsx` is a mode-based state machine: `type Mode = "signin" | "signup" | "reset"` (line 10) with a `submit()` dispatcher and per-mode rendering. Extend it:

1. `type Mode = "signin" | "signup" | "reset" | "mfa";` and add `const [code, setCode] = useState("");`
2. In the `signin` branch of `submit()` (lines 33–37), replace `else router.push("/");` with:

```ts
else {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") switchMode("mfa");
  else router.push("/");
}
```

3. Add an `mfa` branch to `submit()`:

```ts
} else if (mode === "mfa") {
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) {
    setBusy(false);
    return setError("No authenticator found for this account.");
  }
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (cErr || !challenge) {
    setBusy(false);
    return setError(friendlyAuthError(cErr?.message ?? "Verification failed"));
  }
  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  });
  setBusy(false);
  if (vErr) setError("That code didn't match — try again.");
  else router.push("/");
}
```

4. Render: when `mode === "mfa"`, hide the email/password/Google sections and show one `Input` (id `mfa-code`, `inputMode="numeric"`, `autoComplete="one-time-code"`, bound to `code`) with `Label` "Authentication code", reusing the existing `Label`/`Input`/`FieldError`/`Button` components and submit-label pattern (`busy ? "Verifying…" : "Verify"`).
5. Honor the middleware redirect: read `useSearchParams()`; if `mfa=1` and a session exists (`supabase.auth.getSession()` in a `useEffect`), start in `mode === "mfa"`.

- [ ] **Step 3: Settings enrollment UI**

Create `src/components/auth/mfa-settings.tsx` (client component): lists factors (`listFactors`), offers Enroll (calls `enroll({ factorType: "totp" })`, renders returned `totp.qr_code` SVG + `totp.secret` as copyable text, then `challenge` + `verify` with the user's first code to activate) and Remove (`unenroll({ factorId })` with a confirm step). Create `src/app/(app)/settings/security/page.tsx` rendering it, following the structure/copy conventions of `src/app/(app)/settings/members/page.tsx`, and add the "Security" entry wherever the settings nav lists "Members" (locate it in the settings layout/nav component and mirror the existing entry).

- [ ] **Step 4: Verify end-to-end in the browser**

With chrome-devtools MCP against local: enroll a test user with a TOTP app (or an otpauth debug tool), sign out, sign back in → password then code prompt; wrong code rejected; correct code lands on dashboard; middleware blocks direct navigation to `/` between password and code steps (expect redirect to `/login?mfa=1`). `npm run type-check` and `npm run lint` pass.

- [ ] **Step 5: Phase 4 checkpoint**

Update `docs/ROADMAP.md`, then `/git-workflow-planning:checkpoint 4 "TOTP MFA enroll + login challenge + AAL2 middleware"`.

---

## Finish

- [ ] Run full verification: `npm run type-check && npm run lint && npm run test`, plus a browser pass over login, dashboard, transactions, settings (Rule 4 tooling).
- [ ] `/git-workflow-planning:finish` (pushes, opens PR; never merges to main without approval).

---

## Appendix A — Production cutover steps that need YOU (not automatable from this machine)

These are deliberately outside the code plan; the branch is deploy-safe only after A1–A3 are done:

1. **A1 — prod `app_admin` password:** after the migration reaches prod, run `ALTER ROLE app_admin WITH PASSWORD '<strong-generated>';` against the hosted DB (Supabase SQL editor), then set `ADMIN_DATABASE_URL` in Vercel env (all environments) using the pooler host. Remove `DIRECT_URL` and rotate the `postgres` password. (Same procedure already used for `app_runtime`.)
2. **A2 — rotate `SUPABASE_SERVICE_ROLE_KEY`** (used only by `src/services/membership-service.ts` for invites/email lookups — legitimately needed; keep it server-only, never `NEXT_PUBLIC_`).
3. **A3 — rotate `API_SERVICE_TOKEN`** to a long random value (`openssl rand -base64 48`).
4. Supabase Auth dashboard: enable leaked-password protection (HaveIBeenPwned), enable CAPTCHA on sign-in/sign-up, enable TOTP MFA (gate for Phase 4), confirm email-change requires confirmation on both addresses.
5. Supabase project: enable network restrictions for direct DB connections, confirm PITR/backup tier, run Database Advisors and clear findings.
6. Vercel: enable WAF rate-limit rule for `/api/*` and Attack Challenge Mode awareness; confirm all secrets are server-scoped.
7. Your own accounts (Supabase, Vercel, GitHub, domain registrar): hardware-key or TOTP MFA — an owner-account compromise bypasses everything in this plan.
8. Incident basics: write the one-page credential-rotation runbook (which keys, where, in what order) and a user-notification template.

## Appendix B — Explicitly out of scope (future plans)

- Account deletion + data-export product flows (user-trust features; separate `feature-` plan).
- Nonce-based strict CSP (requires middleware nonce plumbing; revisit post-launch).
- Application-level field encryption (assessed 2026-07-20: not worth the reporting/query cost for amounts/categories; only candidate is free-text `notes`).
- Error monitoring (Sentry) — needs an account/DSN decision first.
