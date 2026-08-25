export function getFactoryApiUrl(url = process.env.FACTORY_API_URL) {
  return (url ?? "http://localhost:3004").replace(/\/$/, "");
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

export function getSafeReturnPath(path, allowedPaths, fallbackPath) {
  return typeof path === "string" && allowedPaths.includes(path)
    ? path
    : fallbackPath;
}
