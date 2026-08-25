import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("Factory API authentication surface", () => {
  it("does not export or implement the obsolete Next OAuth callback", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(repoRoot, "packages/auth/package.json"), "utf8"),
    );

    expect(packageJson.exports).not.toHaveProperty("./routes");
    await expect(
      access(path.join(repoRoot, "packages/auth/src/routes.js")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      access(path.join(repoRoot, "apps/home/app/auth/callback/route.js")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("contains no direct Supabase client or public Supabase configuration", async () => {
    const packageJson = await readFile(
      path.join(repoRoot, "packages/auth/package.json"),
      "utf8",
    );
    const sourcePaths = [
      "src/client.js",
      "src/core.js",
      "src/proxy.js",
      "src/server.js",
    ];

    const forbidden = new RegExp(
      `${["@", "supabase"].join("")}/(?:ssr|supabase-js)|${["NEXT", "PUBLIC", "SUPABASE"].join("_")}_`,
    );
    expect(packageJson).not.toMatch(forbidden);
    for (const sourcePath of sourcePaths) {
      const source = await readFile(
        path.join(repoRoot, "packages/auth", sourcePath),
        "utf8",
      );
      expect(source).not.toMatch(forbidden);
    }
  });
});
