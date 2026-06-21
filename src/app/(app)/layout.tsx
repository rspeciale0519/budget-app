import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { TabBar } from "@/components/workspace/tab-bar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <TabBar userId={user.id} />
      <main className="mx-auto max-w-[1180px] px-5 pb-16 pt-1">{children}</main>
    </div>
  );
}
