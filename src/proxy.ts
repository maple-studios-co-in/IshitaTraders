import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["__Host-ishita_admin", "ishita_admin"];

/**
 * Optimistic gate for the admin: no session cookie → straight to the login page (with a return
 * path), before any rendering. The real checks run in every admin page, action and API route.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (pathname !== "/admin/login" && !hasSession) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
