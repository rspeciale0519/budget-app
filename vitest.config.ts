import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "prisma/**/*.test.ts"],
    // The integration tests share one local Postgres and reuse fixed fixture ids
    // (workspace/membership/bill keys). Running test files in parallel worker
    // threads lets those inserts collide (unique-constraint failures), making the
    // suite flaky. Serialize file execution so DB access is deterministic.
    fileParallelism: false,
  },
});
