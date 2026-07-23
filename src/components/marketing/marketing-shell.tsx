import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

// Shared marketing chrome. Used by the (marketing) route-group layout and by the
// root landing page (which lives at "/" outside the group so it can also host
// the authenticated app-dispatch).
export function MarketingShell({ children }: { children: React.ReactNode }) {
  // Force the light "Sterling" identity for the public site. data-theme="light"
  // re-declares the light token values on this subtree, overriding any stored
  // dark preference the boot script stamped on <html>.
  return (
    <div data-theme="light" className="flex min-h-dvh flex-col bg-paper text-ink">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
