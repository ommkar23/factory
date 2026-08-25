import { existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensions = new Set([
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".yaml",
  ".yml",
]);

export function existingPrettierTrackedFiles(files, exists = existsSync) {
  return files.filter(
    (file) => extensions.has(file.slice(file.lastIndexOf("."))) && exists(file),
  );
}

export function run(mode) {
  if (!["check", "write"].includes(mode)) {
    throw new Error(
      "Usage: node scripts/checks/prettier-tracked.mjs <check|write>",
    );
  }

  const tracked = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const files = existingPrettierTrackedFiles(tracked);
  const result = spawnSync(
    "pnpm",
    ["exec", "prettier", `--${mode}`, ...files],
    {
      stdio: "inherit",
    },
  );
  return result.status ?? 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = run(process.argv[2]);
}
