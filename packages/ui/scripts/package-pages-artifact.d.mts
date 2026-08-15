export type PackagePagesArtifactOptions = Readonly<{
  artifactDirectory: string;
  basePath?: string;
  storybookDirectory: string;
}>;

export function packagePagesArtifact(
  options: PackagePagesArtifactOptions,
): Promise<void>;

export function parseCliOptions(
  argumentsList: readonly string[],
): Record<string, string>;
