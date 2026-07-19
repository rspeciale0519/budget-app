import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <PageHeading>Settings</PageHeading>
      <Card>
        <CardHeader>
          <CardTitle>Sharing &amp; members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>Invite someone and choose which books they can see.</p>
          <Link
            href="/settings/members"
            className="inline-flex h-9 items-center justify-center rounded-control border border-rule-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-dim hover:bg-raised"
          >
            Manage sharing
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
