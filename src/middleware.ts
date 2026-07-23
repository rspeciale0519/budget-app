import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Marketing pages that need no auth and no session: an anonymous visitor and a
// signed-in one see exactly the same page, so we skip the Supabase round-trip
// entirely for these.
const PUBLIC_PREFIXES = ["/features", "/pricing", "/demo", "/about", "/blog", "/faq", "/legal", "/signup"];

function isPurePublic(path: string): boolean {
  return (
    // OG image is fetched by unauthenticated crawlers (no file extension, so the
    // matcher doesn't skip it — handle it here).
    path.endsWith("/opengraph-image") ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))
  );
}

// Auth gate + Supabase session refresh (edge runtime — no DB here). Workspace
// dispatch happens in the node-runtime pages.
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Pure-public marketing pages: no user is read and no session needs refreshing,
  // so return immediately without calling the auth server.
  if (isPurePublic(path)) return NextResponse.next({ request });

  // Everything else — "/", "/login", "/auth/*", and the protected app — reads the
  // user and refreshes the session cookie via getUser().
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "/" is public (landing for anon, dispatch for authed — the page decides).
  // The auth flow (/login, /auth/*) must never bounce to /login.
  const isAuthFlow = path === "/login" || path.startsWith("/auth");
  if (!user && path !== "/" && !isAuthFlow) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip Next internals, the API, and real static files (by extension) so public
  // assets like /marketing/hero.png and /sitemap.xml are served directly. Dotted
  // app routes that are NOT static files still run through middleware, so session
  // refresh is never silently dropped.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|map|txt|xml|json|woff2?|ttf|otf)$).*)",
  ],
};
