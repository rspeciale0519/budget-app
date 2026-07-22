import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

// Shared marketing chrome. Used by the (marketing) route-group layout and by the
// root landing page (which lives at "/" outside the group so it can also host
// the authenticated app-dispatch).
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
