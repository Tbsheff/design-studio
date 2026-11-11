interface FolderContextSource {
  readonly files: readonly string[];
  readonly folder: string;
  readonly hasMoreFiles: boolean;
  readonly name: string;
  readonly readme: string | null;
}

const README_MAX = 4000;

const toReadmeBlock = (readme: string | null): string[] => {
  if (readme === null || readme.trim() === "") {
    return ["## README", "", "The folder has no README."];
  }

  const text = readme.trim();

  if (text.length <= README_MAX) {
    return ["## README", "", text];
  }

  return ["## README (first part)", "", text.slice(0, README_MAX)];
};

const toFileBlock = (source: FolderContextSource): string[] => {
  if (source.files.length === 0) {
    return ["## Files", "", "The folder has no files that the studio lists."];
  }

  const lines = source.files.map((file) => `- ${file}`);

  if (source.hasMoreFiles) {
    lines.push("- (more files are not listed)");
  }

  return ["## Files", "", ...lines];
};

const toFolderContext = (source: FolderContextSource): string =>
  [
    `# Source folder: ${source.name}`,
    "",
    `This prototype is for the folder \`${source.folder}\`. Read this file for context. Do not read or write the folder itself.`,
    "",
    ...toReadmeBlock(source.readme),
    "",
    ...toFileBlock(source),
    "",
  ].join("\n");

export { toFolderContext };

export type { FolderContextSource };
