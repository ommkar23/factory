import { updateAuthSession } from "@factory/auth/proxy";
import { NextResponse } from "next/server";

function isPublicRoute(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/logged-out" ||
    pathname === "/api/health" ||
    pathname === "/api/auth/dev/bootstrap" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}

function isFactoryApiRoute(pathname) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (
    !isPublicRoute(pathname) &&
    !isFactoryApiRoute(pathname) &&
    !request.cookies.get("Factory-Access-Token")?.value
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return updateAuthSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
