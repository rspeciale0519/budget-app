import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccessibleWorkspaces } from "@/services/authz";
import { bootstrapOrgForUser } from "@/services/membership-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let workspaces = await listAccessibleWorkspaces(user.id);
  if (workspaces.length === 0) {
    // First run: provision an org + Personal workspace for this user.
    await bootstrapOrgForUser(user.id);
    workspaces = await listAccessibleWorkspaces(user.id);
  }
  // With more than one book, land on the combined "All books" overview; a
  // single-book user's book already IS the whole picture, so go straight to it.
  if (workspaces.length > 1) redirect("/all");
  const first = workspaces[0];
  redirect(first ? `/w/${first.id}` : "/all");
}
