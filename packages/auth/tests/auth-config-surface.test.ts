import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
});
