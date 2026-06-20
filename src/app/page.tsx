import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listAccessibleWorkspaces } from "@/services/authz";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspaces = await listAccessibleWorkspaces(user.id);
  const first = workspaces[0];
  redirect(first ? `/w/${first.id}` : "/all");
}
