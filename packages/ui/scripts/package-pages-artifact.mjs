import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBasePath = "/factory/storybook/";

const canonicalStoryTargets = [
  {
    appPath: "apps/home/stories/app-directory.stories.tsx",
    exportName: "Default",
    redirectPath: "home",
    title: "Factory Home",
  },
  {
    appPath: "apps/live-splash/stories/live-splash-home.stories.tsx",
    exportName: "Default",
    redirectPath: "live-splash",
    title: "Live Splash",
  },
  {
    appPath: "apps/weather/stories/weather-screen.stories.tsx",
    exportName: "Composed",
    redirectPath: "weather",
    title: "Weather",
  },
];

export async function packagePagesArtifact({
  artifactDirectory,
  basePath = defaultBasePath,
  storybookDirectory,
}) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const sourceDirectory = resolve(storybookDirectory);
  const outputDirectory = resolve(artifactDirectory);

  if (
    outputDirectory === sourceDirectory ||
    sourceDirectory.startsWith(`${outputDirectory}/`)
  ) {
    throw new Error("artifactDirectory must not contain storybookDirectory.");
  }

  const index = await readStorybookIndex(sourceDirectory);
  const redirects = canonicalStoryTargets.map((target) => ({
    ...target,
    storyId: findCanonicalStoryId(index, target),
  }));

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  const packagedStorybookDirectory = join(outputDirectory, "storybook");
  await cp(sourceDirectory, packagedStorybookDirectory, { recursive: true });

  await Promise.all(
    redirects.map(async ({ redirectPath, storyId, title }) => {
      const redirectDirectory = join(packagedStorybookDirectory, redirectPath);
      await mkdir(redirectDirectory, { recursive: true });
      await writeFile(
        join(redirectDirectory, "index.html"),
        createRedirectDocument({
          basePath: normalizedBasePath,
          storyId,
          title,
        }),
        "utf8",
      );
    }),
  );
}

function normalizeBasePath(basePath) {
  if (!basePath.startsWith("/") || !basePath.endsWith("/")) {
    throw new Error("basePath must start and end with '/'.");
  }

  return basePath;
}

async function readStorybookIndex(storybookDirectory) {
  const indexPath = join(storybookDirectory, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));

  if (!index.entries || typeof index.entries !== "object") {
    throw new Error(
      `Storybook index at ${indexPath} does not contain entries.`,
    );
  }

  return index;
}

function findCanonicalStoryId(index, target) {
  const matches = Object.values(index.entries).filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      entry.type === "story" &&
      entry.exportName === target.exportName &&
      typeof entry.importPath === "string" &&
      entry.importPath.endsWith(target.appPath) &&
      typeof entry.id === "string",
  );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${target.title} canonical story, found ${matches.length}.`,
    );
  }

  return matches[0].id;
}

function createRedirectDocument({ basePath, storyId, title }) {
  const storyUrl = `${basePath}?path=/story/${encodeURIComponent(storyId)}`;
  const escapedStoryUrl = escapeHtmlAttribute(storyUrl);
  const escapedTitle = escapeHtmlText(title);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${escapedStoryUrl}">
    <meta name="robots" content="noindex">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapedTitle} Storybook</title>
  </head>
  <body>
    <p>Opening <a href="${escapedStoryUrl}">${escapedTitle} in Storybook</a>.</p>
  </body>
</html>
`;
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtmlText(value) {
  return escapeHtmlAttribute(value).replaceAll(">", "&gt;");
}

export function parseCliOptions(argumentsList) {
  const options = {};
  const optionArguments =
    argumentsList[0] === "--" ? argumentsList.slice(1) : argumentsList;

  for (let index = 0; index < optionArguments.length; index += 2) {
    const flag = optionArguments[index];
    const value = optionArguments[index + 1];

    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(
        "Usage: package-pages-artifact --output <directory> [--input <directory>] [--base-path <path>]",
      );
    }

    options[flag.slice(2)] = value;
  }

  return options;
}

async function runCli() {
  const options = parseCliOptions(process.argv.slice(2));
  if (!options.output) {
    throw new Error(
      "Usage: package-pages-artifact --output <directory> [--input <directory>] [--base-path <path>]",
    );
  }

  await packagePagesArtifact({
    artifactDirectory: options.output,
    basePath: options["base-path"] ?? defaultBasePath,
    storybookDirectory:
      options.input ?? join(packageDirectory, "storybook-static"),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
