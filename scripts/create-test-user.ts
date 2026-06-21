import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const email = process.env.TEST_EMAIL ?? "owner@test.local";
const password = process.env.TEST_PASSWORD ?? "Password123!";

async function main() {
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.log(`createUser: ${error.message} (may already exist — that's fine)`);
  } else {
    console.log(`Created confirmed user ${email} id=${data.user?.id}`);
  }
}

main();
