import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  packagePagesArtifact,
  parseCliOptions,
} from "../scripts/package-pages-artifact.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("packagePagesArtifact", () => {
  it("accepts pnpm's argument separator before the output option", () => {
    expect(parseCliOptions(["--", "--output", "/tmp/pages"])).toEqual({
      output: "/tmp/pages",
    });
  });

  it("rejects an artifact directory that would delete the Storybook source", async () => {
    const storybookDirectory = await mkdtemp(
      join(tmpdir(), "factory-pages-source-"),
    );
    temporaryDirectories.push(storybookDirectory);
    await writeFile(join(storybookDirectory, "index.json"), '{"entries":{}}');

    await expect(
      packagePagesArtifact({
        artifactDirectory: storybookDirectory,
        storybookDirectory,
      }),
    ).rejects.toThrow("artifactDirectory must not contain storybookDirectory.");
  });

  it("nests Storybook and creates app redirects from generated story metadata", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "factory-pages-"));
    temporaryDirectories.push(temporaryDirectory);

    const storybookDirectory = join(temporaryDirectory, "storybook-static");
    const artifactDirectory = join(temporaryDirectory, "pages-artifact");
    await mkdir(storybookDirectory, { recursive: true });
    await writeFile(
      join(storybookDirectory, "index.html"),
      "<main>Storybook</main>",
    );
    await writeFile(
      join(storybookDirectory, "index.json"),
      JSON.stringify({
        entries: {
          "home-app-directory--default": {
            exportName: "Default",
            id: "home-app-directory--default",
            importPath: "../../../apps/home/stories/app-directory.stories.tsx",
            type: "story",
          },
          "live-splash-home--default": {
            exportName: "Default",
            id: "live-splash-home--default",
            importPath:
              "../../../apps/live-splash/stories/live-splash-home.stories.tsx",
            type: "story",
          },
          "weather-screen--composed": {
            exportName: "Composed",
            id: "weather-screen--composed",
            importPath:
              "../../../apps/weather/stories/weather-screen.stories.tsx",
            type: "story",
          },
        },
      }),
    );

    await packagePagesArtifact({
      artifactDirectory,
      storybookDirectory,
    });

    await expect(
      readFile(join(artifactDirectory, "storybook", "index.html"), "utf8"),
    ).resolves.toContain("Storybook");

    for (const [entry, storyId] of [
      ["home", "home-app-directory--default"],
      ["live-splash", "live-splash-home--default"],
      ["weather", "weather-screen--composed"],
    ]) {
      await expect(
        readFile(
          join(artifactDirectory, "storybook", entry, "index.html"),
          "utf8",
        ),
      ).resolves.toContain(
        `/factory/storybook/?path=/story/${encodeURIComponent(storyId)}`,
      );
    }
  });
});
