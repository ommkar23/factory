import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const configurationPaths = [
  "Dockerfile",
  "README.md",
  "cloudbuild.bootstrap.yaml",
  "scripts/setup-factory-dev.sh",
  "infra/gcp/README.md",
  "apps/home/.env.example",
  "apps/live-splash/.env.example",
  "apps/weather/.env.example",
  ".github/workflows/deploy-cloud-run.yml",
  ".github/workflows/pr-validation.yml",
];
describe("authentication configuration surface", () => {
  it("does not document or configure the removed AUTH_MODE switch", async () => {
    for (const configurationPath of configurationPaths) {
      const content = await readFile(
        path.join(repoRoot, configurationPath),
        "utf8",
      );
      expect(content, configurationPath).not.toContain("AUTH_MODE");
    }
  });

  it("uses explicit relative extensions in directly exported ESM modules", async () => {
    const expectedSpecifiers = {
      "src/client.js": ["./core.js"],
      "src/server.js": ["./core.js"],
      "src/routes.js": ["./core.js"],
      "src/proxy.js": ["./core.js"],
      "src/auth-controls.jsx": ["./client.js", "./core.js"],
    };

    for (const [sourcePath, specifiers] of Object.entries(expectedSpecifiers)) {
      const content = await readFile(
        path.join(repoRoot, "packages/auth", sourcePath),
        "utf8",
      );
      for (const specifier of specifiers) {
        expect(content, `${sourcePath} should import ${specifier}`).toContain(
          specifier,
        );
      }
    }
  });

  it("loads the browser client through native Node ESM resolution", async () => {
    await execFileAsync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'await import("./packages/auth/src/client.js")',
      ],
      { cwd: repoRoot },
    );
  });
});
