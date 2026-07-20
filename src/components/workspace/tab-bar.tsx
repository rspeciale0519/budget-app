import Link from "next/link";
import { listAccessibleWorkspaces } from "@/services/authz";
import { listLayouts } from "@/services/layout-service";
import { prismaAdmin } from "@/lib/prisma-admin";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { AvatarMenu } from "@/components/chrome/avatar-menu";
import { SearchButton } from "@/components/chrome/search-button";
import { LayoutsDropdown } from "@/components/chrome/layouts-dropdown";
import { TilesGlyph } from "@/components/ui/glyphs";

export async function TabBar({ userId }: { userId: string }) {
  const workspaces = await listAccessibleWorkspaces(userId);
  const orgMembership = await prismaAdmin.orgMembership.findFirst({
    where: { userId },
  });
  const layouts = orgMembership
    ? await listLayouts(userId, orgMembership.organizationId).catch(() => [])
    : [];
  const isOrgAdmin = orgMembership && ["owner", "admin"].includes(orgMembership.role);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap">
          <LedgerMark />
          <span className="font-serif text-[19px] font-medium leading-none tracking-[-0.01em] text-ink">
            Ledger
          </span>
        </Link>

        <WorkspaceTabs
          workspaces={workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            color: w.color,
            icon: w.icon,
            type: w.type,
          }))}
          organizationId={isOrgAdmin ? orgMembership!.organizationId : null}
        />

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/tiles"
            className="flex h-9 w-9 items-center justify-center rounded-control border border-rule bg-surface text-sm text-ink/85 transition-colors hover:border-dim hover:bg-raised lg:hidden"
            title="Side by side"
            aria-label="Side by side"
          >
            <TilesGlyph />
          </Link>
          <Link
            href="/tiles"
            className="hidden h-9 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-xs font-semibold text-ink/85 transition-colors hover:border-dim hover:bg-raised lg:flex"
            title="See multiple books side by side"
          >
            <TilesGlyph /> Side by side
          </Link>
          <LayoutsDropdown layouts={layouts} />
          <SearchButton />
          <ThemeToggle />
          <AvatarMenu initial={initial} email={user?.email ?? ""} />
        </div>
      </div>
    </div>
  );
}

/*
  The mark is an engraved coin: the credit/now gradient the whole app runs on,
  struck through with a hairline horizon — the present-moment line that is the
  product's organizing idea, in miniature.
*/
function LedgerMark() {
  return (
    <span className="relative grid h-[22px] w-[22px] place-items-center overflow-hidden rounded-[7px] bg-gradient-to-br from-now to-credit">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-paper/60" />
    </span>
  );
}
