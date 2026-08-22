import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseConfig, isDevelopmentAuthBypass } from "./core.js";
export async function updateAuthSession(request) {
  if (isDevelopmentAuthBypass()) {
    return NextResponse.next({ request });
  }
  const { publishableKey, url } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  // getClaims validates the JWT; never authorize requests using getSession here.
  await supabase.auth.getClaims();
  return response;
}
