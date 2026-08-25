import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { clientBoundary } from "../../factory.config.mjs";

const ALLOWED_APP_API_ROUTES = new Set(clientBoundary.allowedAppApiRoutes);
const ALLOWED_APP_DEPENDENCIES = new Set(clientBoundary.allowedAppDependencies);
const ALLOWED_PACKAGE_DEPENDENCIES = new Map(
  Object.entries(clientBoundary.allowedPackageDependencies).map(
    ([manifest, dependencies]) => [manifest, new Set(dependencies)],
  ),
);
const DEFAULT_PACKAGE_DEPENDENCIES = new Set(
  clientBoundary.allowedAppDependencies,
);
const DYNAMIC_NETWORK_ADAPTERS = new Map(
  Object.entries(clientBoundary.dynamicNetworkAdapters),
);

function isAllowedFetchArgument(argument) {
  return (
    /^["\x27`]\/(?:auth|app)\//.test(argument) ||
    /^["\x27`]\/api\/auth\/dev\/bootstrap["\x27`]/.test(argument) ||
    /^`\$\{getFactoryApiUrl\(\)\}\/auth\//.test(argument)
  );
}

function hasUnapprovedNetworkCall(file) {
  if (
    /\b(?:axios(?:\.[a-z]+)?|ky|got)\s*\(/.test(file.content) ||
    /\bnew\s+(?:XMLHttpRequest|EventSource|WebSocket)\s*\(/.test(
      file.content,
    ) ||
    /\bnavigator\.sendBeacon\s*\(/.test(file.content)
  ) {
    return true;
  }

  for (const match of file.content.matchAll(/\bfetch\s*(?:\?\.\s*)?\(\s*/g)) {
    const argument = file.content.slice(match.index + match[0].length);
    if (!isAllowedFetchArgument(argument)) {
      return true;
    }
  }

  const dynamicAdapter = DYNAMIC_NETWORK_ADAPTERS.get(file.path);
  for (const match of file.content.matchAll(/\bfetcher\s*\(\s*([^,\n)]+)/g)) {
    if (!dynamicAdapter || match[1].trim() !== dynamicAdapter.argumentName) {
      return true;
    }
  }

  if (dynamicAdapter) {
    for (const match of file.content.matchAll(
      /\bgetJson\s*\(\s*fetcher\s*,\s*/g,
    )) {
      const prefix = file.content.slice(
        Math.max(0, match.index - 20),
        match.index,
      );
      if (/function\s+$/.test(prefix)) {
        continue;
      }
      const urlArgument = file.content.slice(match.index + match[0].length);
      if (!/^["\x27`]\/(?:auth|app)\//.test(urlArgument)) {
        return true;
      }
    }
  }

  return false;
}

const EXCLUDED_PATH_SEGMENTS = new Set([
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "fixtures",
  "generated",
  "node_modules",
  "out",
  "stories",
  "storybook-static",
  "test",
  "tests",
]);
const RUNTIME_SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;
const NON_RUNTIME_SOURCE_FILE = /\.(?:test|spec|stories)\.[cm]?[jt]sx?$/;

function isBoundaryFile(path) {
  const segments = path.split("/");
  if (segments.some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment))) {
    return false;
  }

  const isManifest = /^(?:apps|packages)\/[^/]+\/package\.json$/.test(path);
  const isAppConfig = /^apps\/[^/]+\/\.env\.example$/.test(path);
  const isRuntimeSource =
    RUNTIME_SOURCE_EXTENSION.test(path) &&
    !NON_RUNTIME_SOURCE_FILE.test(path) &&
    (/^apps\/[^/]+\//.test(path) || /^packages\/[^/]+\/src\//.test(path));
  return isManifest || isAppConfig || isRuntimeSource;
}

export function trackedClientBoundaryPaths(repositoryRoot) {
  return execFileSync("git", ["ls-files", "-z", "--", "apps", "packages"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter(isBoundaryFile)
    .filter((path) => existsSync(join(repositoryRoot, path)))
    .sort();
}

export function collectClientBoundaryFiles(repositoryRoot) {
  return trackedClientBoundaryPaths(repositoryRoot).map((path) => ({
    content: readFileSync(join(repositoryRoot, path), "utf8"),
    path,
  }));
}

function getAppApiRoute(path) {
  const route = path.match(
    /^apps\/[^/]+\/(?:src\/)?app\/(.+)\/route\.(?:[cm]?[jt]sx?)$/,
  );
  if (!route) {
    return undefined;
  }

  const segments = route[1]
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment) && !segment.startsWith("@"));
  return segments[0] === "api" ? segments.join("/") : undefined;
}

export function analyzeClientApiBoundary(files) {
  const violations = [];

  for (const file of files) {
    if (/^(?:apps|packages)\/[^/]+\/package\.json$/.test(file.path)) {
      const manifest = JSON.parse(file.content);
      const allowedDependencies = file.path.startsWith("apps/")
        ? ALLOWED_APP_DEPENDENCIES
        : (ALLOWED_PACKAGE_DEPENDENCIES.get(file.path) ??
          DEFAULT_PACKAGE_DEPENDENCIES);
      const productionDependencySections = [
        ["dependencies", manifest.dependencies ?? {}],
        ["optionalDependencies", manifest.optionalDependencies ?? {}],
        ["peerDependencies", manifest.peerDependencies ?? {}],
      ];
      for (const [section, dependencies] of productionDependencySections) {
        for (const [dependency, version] of Object.entries(dependencies)) {
          const isFactoryWorkspaceDependency =
            dependency.startsWith("@factory/") &&
            version.startsWith("workspace:");
          const isAllowedPeerBaseline =
            section === "peerDependencies" &&
            DEFAULT_PACKAGE_DEPENDENCIES.has(dependency);
          if (
            !allowedDependencies.has(dependency) &&
            !isAllowedPeerBaseline &&
            !isFactoryWorkspaceDependency
          ) {
            violations.push({
              code: "production-dependency",
              dependency,
              path: file.path,
            });
          }
        }
      }
    }

    const appApiRoute = getAppApiRoute(file.path);
    if (appApiRoute && !ALLOWED_APP_API_ROUTES.has(appApiRoute)) {
      violations.push({ code: "app-api-route", path: file.path });
    }

    if (hasUnapprovedNetworkCall(file)) {
      violations.push({ code: "network-call", path: file.path });
    }

    if (
      /\b(?:NEXT_PUBLIC_|PUBLIC_)[A-Z0-9_]*(?:API_KEY|_KEY|SECRET|TOKEN|CREDENTIALS?|CLIENT_ID|URL|ENDPOINT|HOST)\b/.test(
        file.content,
      )
    ) {
      violations.push({ code: "public-provider-config", path: file.path });
    }
  }

  return violations;
}
