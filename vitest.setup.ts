// Load env for tests (Prisma + app code). .env.local wins over .env, matching
// Next.js precedence. Pure unit tests don't need these; DB-backed tests do.
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });
