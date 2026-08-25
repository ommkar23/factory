import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

import {
  analyzeClientApiBoundary,
  collectClientBoundaryFiles,
  trackedClientBoundaryPaths,
} from "./client-api-boundary.mjs";
import { factoryApps } from "../../factory.config.mjs";

test("rejects app-owned data route handlers", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: "export async function GET() {}\n",
      path: "apps/example/src/app/(internal)/api/weather/route.ts",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "app-api-route",
      path: "apps/example/src/app/(internal)/api/weather/route.ts",
    },
  ]);
});
test("rejects third-party runtime network calls", () => {
  const violations = analyzeClientApiBoundary([
    {
      content:
        'export const load = () => fetch("https://api.vendor.test/data");\n',
      path: "apps/example/lib/provider.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "network-call",
      path: "apps/example/lib/provider.js",
    },
  ]);
});

test("rejects optional fetch calls to absolute provider URLs", () => {
  const violations = analyzeClientApiBoundary([
    {
      content:
        'export const load = () => fetch?.("https://api.vendor.test/data");\n',
      path: "apps/example/lib/provider.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "network-call",
      path: "apps/example/lib/provider.js",
    },
  ]);
});

test("rejects provider URLs passed through an allowlisted client helper", () => {
  const violations = analyzeClientApiBoundary([
    {
      content:
        'const load = () => getJson(fetcher, "https://api.vendor.test/data");\n',
      path: "apps/weather/lib/weather-api-client.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "network-call",
      path: "apps/weather/lib/weather-api-client.js",
    },
  ]);
});

test("rejects unapproved client production dependencies", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: JSON.stringify({ dependencies: { openmeteo: "1.0.0" } }),
      path: "apps/example/package.json",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "production-dependency",
      dependency: "openmeteo",
      path: "apps/example/package.json",
    },
  ]);
});

test("rejects unapproved shared package production dependencies", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: JSON.stringify({
        dependencies: { "external-provider-sdk": "1.0.0" },
      }),
      path: "packages/shared/package.json",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "production-dependency",
      dependency: "external-provider-sdk",
      path: "packages/shared/package.json",
    },
  ]);
});

test("rejects external provider SDKs in optional dependencies", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: JSON.stringify({
        optionalDependencies: { "external-provider-sdk": "1.0.0" },
      }),
      path: "apps/example/package.json",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "production-dependency",
      dependency: "external-provider-sdk",
      path: "apps/example/package.json",
    },
  ]);
});

test("rejects external provider SDKs in peer dependencies", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: JSON.stringify({
        peerDependencies: { "external-provider-sdk": "1.0.0" },
      }),
      path: "packages/shared/package.json",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "production-dependency",
      dependency: "external-provider-sdk",
      path: "packages/shared/package.json",
    },
  ]);
});

test("rejects public third-party provider configuration", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: "const key = process.env.NEXT_PUBLIC_OPEN_METEO_API_KEY;\n",
      path: "apps/example/lib/provider.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "public-provider-config",
      path: "apps/example/lib/provider.js",
    },
  ]);
});

test("rejects public provider keys without an API_KEY suffix", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: "const key = process.env.NEXT_PUBLIC_OPEN_METEO_KEY;\n",
      path: "apps/example/lib/provider.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "public-provider-config",
      path: "apps/example/lib/provider.js",
    },
  ]);
});

test("rejects unallowlisted dynamic network calls", () => {
  const violations = analyzeClientApiBoundary([
    {
      content: "export const load = (providerUrl) => fetch(providerUrl);\n",
      path: "packages/shared/src/provider.js",
    },
  ]);

  assert.deepEqual(violations, [
    {
      code: "network-call",
      path: "packages/shared/src/provider.js",
    },
  ]);
});

test("discovers every app and browser-facing shared runtime source", () => {
  const files = collectClientBoundaryFiles(
    resolve(import.meta.dirname, "../.."),
  );
  const paths = new Set(files.map((file) => file.path));

  for (const app of factoryApps) {
    assert.ok(paths.has(`${app.directory}/package.json`));
    assert.ok(
      [...paths].some((path) => path.startsWith(`${app.directory}/app/`)),
    );
  }
  for (const sharedSource of [
    "packages/auth/src/client.js",
    "packages/contracts/src/index.js",
    "packages/ui/src/index.js",
  ]) {
    assert.ok(paths.has(sharedSource), `${sharedSource} must be covered`);
  }
  assert.ok(
    [...paths].every(
      (path) =>
        !/(^|\/)(?:tests?|stories|fixtures|\.next|dist|build|coverage)(?:\/|$)/.test(
          path,
        ) && !/\.(?:test|spec|stories)\.[cm]?[jt]sx?$/.test(path),
    ),
  );
});

test("boundary discovery excludes machine-local environment files", () => {
  const repositoryRoot = resolve(import.meta.dirname, "../..");
  const paths = trackedClientBoundaryPaths(repositoryRoot);

  assert.ok(paths.some((path) => path.endsWith("/.env.example")));
  assert.ok(paths.every((path) => !path.endsWith("/.env.local")));
});

test("the current repository satisfies the client API boundary", () => {
  const files = collectClientBoundaryFiles(
    resolve(import.meta.dirname, "../.."),
  );

  assert.deepEqual(analyzeClientApiBoundary(files), []);
});

test("the root check runs the client API boundary guard", () => {
  const repositoryRoot = resolve(import.meta.dirname, "../..");
  const manifest = JSON.parse(
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
  );

  assert.match(
    manifest.scripts.check,
    /node --test scripts\/checks\/client-api-boundary\.test\.mjs/,
  );
});
