export const DEVELOPMENT_BYPASS_USER = {
  id: "development-bypass",
  email: "developer@factory.local",
  name: "Factory Developer",
  avatarUrl: null,
};
export function isDevelopmentAuthBypass(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "development";
}
export const AUTH_CALLBACK_DESTINATIONS = ["/", "/live-splash", "/weather"];
export function getProductionOAuthCallbackUrl(next) {
  return `https://factory.markagen.ai/auth/callback?next=${next}`;
}
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.",
    );
  }
  return { publishableKey, url };
}
export function getAuthPath(basePath, path) {
  const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `/${[normalizedBasePath, normalizedPath].filter(Boolean).join("/")}`;
}
export function getLoginPath(basePath) {
  return getAuthPath(basePath, "/login");
}
/**
 * Shared-origin deployments are opted into at build time with
 * FACTORY_SHARED_ORIGIN=true. Individual deployments keep root-relative routes.
 */
export function getRequestBasePath(
  productionBasePath,
  sharedOrigin = process.env.FACTORY_SHARED_ORIGIN === "true",
) {
  return sharedOrigin ? productionBasePath : "";
}
export function getUserInitials(user) {
  const value = user.name ?? user.email ?? user.id;
  const words = value
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "U";
}
