import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_CALLBACK_DESTINATIONS,
  createMockToken,
  getAuthMode,
  getSupabaseConfig,
} from "./core";
import { MOCK_AUTH_COOKIE } from "./server";

function getCallbackOrigin(request: NextRequest): string {
  // Cloud Run receives the request from the load balancer over its internal
  // listener, so `request.url` can resolve to 0.0.0.0:8080. OAuth redirects
  // must always use the public shared origin.
  return getAuthMode() === "supabase"
    ? "https://factory.markagen.ai"
    : request.nextUrl.origin;
}

function getCallbackDestination(request: NextRequest): URL {
  const next = request.nextUrl.searchParams.get("next");
  const destinationPath =
    next !== null &&
    AUTH_CALLBACK_DESTINATIONS.includes(
      next as (typeof AUTH_CALLBACK_DESTINATIONS)[number],
    )
      ? next
      : "/";

  return new URL(destinationPath, getCallbackOrigin(request));
}

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
): Promise<NextResponse> {
  const destination = getCallbackDestination(request);
  const errorDestination = new URL("/", getCallbackOrigin(request));

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
