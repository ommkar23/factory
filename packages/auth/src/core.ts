export const DEV_USER_ID = "dev-user-0001";

export type AuthMode = "mock" | "supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

const MOCK_TOKEN_PREFIX = "factory-mock.";

export const AUTH_CALLBACK_DESTINATIONS = [
  "/",
  "/live-splash",
  "/weather",
] as const;

type AuthCallbackDestination = (typeof AUTH_CALLBACK_DESTINATIONS)[number];

export function getProductionOAuthCallbackUrl(
  next: AuthCallbackDestination,
): string {
  return `https://factory.markagen.ai/auth/callback?next=${next}`;
}

export function getSupabaseConfig(): {
  publishableKey: string;
  url: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required when AUTH_MODE=supabase.",
    );
  }

  return { publishableKey, url };
}

export function getAuthMode(
  value = process.env.AUTH_MODE,
  nodeEnv = process.env.NODE_ENV,
): AuthMode {
  if (value === undefined || value === "") {
    return nodeEnv === "development" ? "mock" : "supabase";
  }

  if (value === "mock") {
    if (nodeEnv !== "development") {
      throw new Error(
        "AUTH_MODE=mock is only allowed when NODE_ENV=development.",
      );
    }

    return "mock";
  }

  if (value === "supabase") {
    return "supabase";
  }

  throw new Error('AUTH_MODE must be either "mock" or "supabase".');
}

export function getMockUser(): AuthUser {
  return {
    id: DEV_USER_ID,
    email: "dev-user@factory.local",
    name: "Factory Developer",
    avatarUrl: null,
  };
}

export function createMockToken(randomId: () => string): string {
  return `${MOCK_TOKEN_PREFIX}${randomId()}`;
}

export function isMockToken(token: string | undefined): boolean {
  return Boolean(token?.startsWith(MOCK_TOKEN_PREFIX));
}

export function getAuthPath(basePath: string, path: string): string {
  const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return `/${[normalizedBasePath, normalizedPath].filter(Boolean).join("/")}`;
}

export function getLoginPath(basePath: string): string {
  return getAuthPath(basePath, "/login");
}

/**
 * Shared-origin deployments are opted into at build time with
 * FACTORY_SHARED_ORIGIN=true. Individual deployments keep root-relative routes.
 */
export function getRequestBasePath(
  productionBasePath: string,
  sharedOrigin = process.env.FACTORY_SHARED_ORIGIN === "true",
): string {
  return sharedOrigin ? productionBasePath : "";
}

export function getUserInitials(user: AuthUser): string {
  const value = user.name ?? user.email ?? user.id;
  const words = value
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "U";
}
