import { trustedCopy } from "./copy.js";
import { pick } from "./pick.js";

const toFolderCountText = (count: number): string =>
  `${String(count)} ${pick(count === 1, trustedCopy.folderOne, trustedCopy.folderMany)}`;

const toAddedFolders = (
  saved: readonly string[],
  raw: string
): readonly string[] => {
  const folder = raw.trim();

  if (folder === "" || saved.includes(folder)) {
    return saved;
  }

  return [...saved, folder];
};

const toRemovedFolders = (
  saved: readonly string[],
  folder: string
): readonly string[] => saved.filter((item) => item !== folder);

const toEnvOnlyFolders = (
  saved: readonly string[],
  env: readonly string[]
): readonly string[] => {
  const savedSet = new Set(saved);

  return env.filter((folder) => !savedSet.has(folder));
};

export {
  toAddedFolders,
  toEnvOnlyFolders,
  toFolderCountText,
  toRemovedFolders,
};
