import { createClient } from "@supabase/supabase-js";

// Resets a user's password (admin). Reads creds + target from env.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const email = process.env.TARGET_EMAIL!;
  const password = process.env.NEW_PASSWORD!;
  const { data: list } = await admin.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === email);
  if (!user) {
    console.error("USER_NOT_FOUND", email);
    process.exit(1);
  }
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error("UPDATE_FAIL", error.message);
    process.exit(1);
  }
  console.log("PASSWORD_SET for", email);
  process.exit(0);
}

main();
