import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware: protects /contributor/* and /admin/* routes.
 * Public routes (/, /atlas, /protocols, /layers, /login) are always accessible.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate contributor and admin routes
  const isProtectedRoute =
    pathname.startsWith("/contributor") || pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check if Supabase is configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // No Supabase — redirect to home (can't auth)
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Create Supabase client for middleware
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin routes, check access role
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("access_role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.access_role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/contributor/:path*", "/admin/:path*"],
};
