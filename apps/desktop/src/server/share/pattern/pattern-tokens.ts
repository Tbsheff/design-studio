import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { loadAppTokens } from "./deps.js";
import type { TokenValue } from "./engine/index.js";

const CSS_FILE = /\.css$/iu;

const DECLARATION = /(?<name>--[\w-]{1,80}):(?<value>[^;{}]{1,200});/gu;

const CSS_FOLDERS = [
  "",
  "css",
  "design-system",
  "styles",
  "assets",
  "src",
] as const;

const FILE_LIMIT = 12;

const toDeclarations = (text: string): readonly TokenValue[] =>
  [...text.matchAll(DECLARATION)].map((match) => ({
    name: match.groups?.name ?? "",
    value: (match.groups?.value ?? "").trim(),
  }));

const getFolderFiles = async (
  workTree: string,
  folder: string
): Promise<readonly string[]> => {
  try {
    const entries = await readdir(path.join(workTree, folder), {
      withFileTypes: true,
    });

    return entries.flatMap((entry) => {
      if (entry.isFile() && CSS_FILE.test(entry.name)) {
        return [path.join(workTree, folder, entry.name)];
      }

      return [];
    });
  } catch {
    return [];
  }
};

const getText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const getScannedTokens = async (
  workTree: string
): Promise<readonly TokenValue[] | null> => {
  const lists = await Promise.all(
    CSS_FOLDERS.map((folder) => getFolderFiles(workTree, folder))
  );

  const texts = await Promise.all(
    lists
      .flat()
      .slice(0, FILE_LIMIT)
      .map((file) => getText(file))
  );

  const found = texts.flatMap((text) => toDeclarations(text));

  if (found.length === 0) {
    return null;
  }

  return found;
};

const getLoadedTokens = async (
  workTree: string
): Promise<readonly TokenValue[] | null> => {
  try {
    const loaded = await loadAppTokens(workTree);

    if (loaded === null || loaded.tokens.length === 0) {
      return null;
    }

    return loaded.tokens.map((token) => ({
      name: token.name,
      value: token.value,
    }));
  } catch {
    return null;
  }
};

const getProjectTokens = async (
  workTree: string
): Promise<readonly TokenValue[] | null> => {
  const loaded = await getLoadedTokens(workTree);

  if (loaded !== null) {
    return loaded;
  }

  return getScannedTokens(workTree);
};

export { getProjectTokens };
