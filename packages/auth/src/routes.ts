import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  createMockToken,
  getAuthMode,
  getAuthPath,
  getLoginPath,
  getSupabaseConfig,
} from "./core";
import { MOCK_AUTH_COOKIE } from "./server";

type CallbackOptions = {
  basePath: string;
};

function mockCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function createMockSignInResponse() {
  if (getAuthMode() !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    MOCK_AUTH_COOKIE,
    createMockToken(() => crypto.randomUUID()),
    mockCookieOptions(),
  );

  return response;
}

export function createMockSignOutResponse() {
  if (getAuthMode() !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(MOCK_AUTH_COOKIE, "", {
    ...mockCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function handleAuthCallback(
  request: NextRequest,
  { basePath }: CallbackOptions,
): Promise<NextResponse> {
  const destination = new URL(getAuthPath(basePath, "/"), request.url);
  const errorDestination = new URL(getLoginPath(basePath), request.url);

  if (getAuthMode() === "mock") {
    return NextResponse.redirect(destination);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    errorDestination.searchParams.set("auth_error", "oauth_callback_failed");
    return NextResponse.redirect(errorDestination);
  }

  const { publishableKey, url } = getSupabaseConfig();
  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    errorDestination.searchParams.set("auth_error", "oauth_callback_failed");
    return NextResponse.redirect(errorDestination);
  }

  return response;
}
