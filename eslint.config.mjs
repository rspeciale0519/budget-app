import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Fence: prismaAdmin bypasses RLS, so it must not creep into pages,
  // components, or actions. The allowlist below is the sanctioned set — each
  // entry has a justification (authz/bootstrap/system-materialization).
  // Adding a file here requires the same justification; prefer rlsClientFor.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/prisma-admin.ts", // the client definition itself
      "src/services/authz.ts", // authoritative authz reads, independent of RLS
      "src/services/membership-service.ts", // org bootstrap, invites, email lookups
      "src/services/workspace-service.ts", // create-workspace bootstrap (no membership yet)
      "src/services/recurring-service.ts", // system recurring-bill materialization
      "src/services/dashboard/planning.ts", // system goal-contribution materialization
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
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
]);

export default eslintConfig;
