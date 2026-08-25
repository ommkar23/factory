import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ALLOWED_APP_API_ROUTES = new Set([
  "api/auth/dev/bootstrap",
  "api/health",
]);
const ALLOWED_APP_DEPENDENCIES = new Set(["next", "react", "react-dom"]);
const ALLOWED_PACKAGE_DEPENDENCIES = new Map([
  ["packages/auth/package.json", new Set(["next"])],
  ["packages/contracts/package.json", new Set()],
  [
    "packages/ui/package.json",
    new Set([
      "@base-ui/react",
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "tailwind-merge",
    ]),
  ],
]);
const DEFAULT_PACKAGE_DEPENDENCIES = new Set(["next", "react", "react-dom"]);

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

  for (const match of file.content.matchAll(/\bfetcher\s*\(\s*([^,\n)]+)/g)) {
    if (
      file.path !== "apps/weather/lib/weather-api-client.js" ||
      match[1].trim() !== "url"
    ) {
      return true;
    }
  }

  if (file.path === "apps/weather/lib/weather-api-client.js") {
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

function walkBoundaryFiles(repositoryRoot, directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_PATH_SEGMENTS.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walkBoundaryFiles(repositoryRoot, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const path = relative(repositoryRoot, absolutePath).split(sep).join("/");
    const isManifest = /^(?:apps|packages)\/[^/]+\/package\.json$/.test(path);
    const isAppConfig = /^apps\/[^/]+\/\.env(?:\..+)?$/.test(path);
    const isRuntimeSource =
      RUNTIME_SOURCE_EXTENSION.test(path) &&
      !NON_RUNTIME_SOURCE_FILE.test(path) &&
      (/^apps\/[^/]+\//.test(path) || /^packages\/[^/]+\/src\//.test(path));

    if (isManifest || isAppConfig || isRuntimeSource) {
      files.push({ content: readFileSync(absolutePath, "utf8"), path });
    }
  }
}

export function collectClientBoundaryFiles(repositoryRoot) {
  const files = [];
  for (const directory of ["apps", "packages"]) {
    walkBoundaryFiles(repositoryRoot, join(repositoryRoot, directory), files);
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
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
