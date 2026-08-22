import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_CALLBACK_DESTINATIONS, getSupabaseConfig } from "./core";

const FACTORY_ORIGIN = "https://factory.markagen.ai";

function getCallbackDestination(request: NextRequest): URL {
  const next = request.nextUrl.searchParams.get("next");
  const destinationPath =
    next !== null &&
    AUTH_CALLBACK_DESTINATIONS.includes(
      next as (typeof AUTH_CALLBACK_DESTINATIONS)[number],
    )
      ? next
      : "/";

  return new URL(destinationPath, FACTORY_ORIGIN);
}

export async function handleAuthCallback(
  request: NextRequest,
): Promise<NextResponse> {
  const destination = getCallbackDestination(request);
  const errorDestination = new URL("/", FACTORY_ORIGIN);
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
