import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getAuthMode,
  getMockUser,
  getSupabaseConfig,
  isMockToken,
  type AuthUser,
} from "./core";

export const MOCK_AUTH_COOKIE = "factory-mock-auth";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. proxy.ts persists refreshes.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getAuthMode() === "mock") {
    const cookieStore = await cookies();

    return isMockToken(cookieStore.get(MOCK_AUTH_COOKIE)?.value)
      ? getMockUser()
      : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    name: null,
    avatarUrl: null,
  };
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  return user;
}
