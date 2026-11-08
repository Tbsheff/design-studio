import { readFile } from "node:fs/promises";
import path from "node:path";

const CSS_CANDIDATES = [
  "src/index.css",
  "src/App.css",
  "src/app.css",
  "src/main.css",
  "src/styles.css",
  "src/style.css",
  "src/globals.css",
  "src/styles/globals.css",
  "src/app/globals.css",
  "app/globals.css",
  "styles/globals.css",
  "src/tailwind.css",
  "app/tailwind.css",
  "index.css",
  "styles.css",
  "style.css",
];

const TOKEN_JSON_CANDIDATES = [
  "tokens.json",
  "design/tokens.json",
  "src/tokens.json",
  "src/styles/tokens.json",
];

const DESIGN_MD = "DESIGN.md";

interface SourceFile {
  file: string;
  relative: string;
  text: string;
}

const toReadOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toReadOne = async (
  workTree: string,
  relative: string
): Promise<SourceFile | null> => {
  const file = path.join(workTree, relative);
  const text = await toReadOrNull(file);

  if (text === null) {
    return null;
  }

  return { file, relative, text };
};

const toReadFiles = async (
  workTree: string,
  candidates: readonly string[]
): Promise<SourceFile[]> => {
  const found = await Promise.all(
    candidates.map((relative) => toReadOne(workTree, relative))
  );

  return found.filter((entry): entry is SourceFile => entry !== null);
};

const toCssFiles = (workTree: string): Promise<SourceFile[]> =>
  toReadFiles(workTree, CSS_CANDIDATES);

const toTokenJsonFiles = (workTree: string): Promise<SourceFile[]> =>
  toReadFiles(workTree, TOKEN_JSON_CANDIDATES);

const toDesignMdFile = (workTree: string): Promise<SourceFile | null> =>
  toReadOne(workTree, DESIGN_MD);

export {
  toCssFiles as cssFiles,
  toDesignMdFile as designMdFile,
  toTokenJsonFiles as tokenJsonFiles,
};

export type { SourceFile };
