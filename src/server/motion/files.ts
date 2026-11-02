import { readFile } from "node:fs/promises";
import path from "node:path";

const CSS_CANDIDATES = [
  "src/index.css",
  "src/app/globals.css",
  "app/globals.css",
  "src/globals.css",
  "src/styles/globals.css",
  "styles/globals.css",
  "src/App.css",
  "src/app.css",
  "src/main.css",
  "src/styles.css",
  "src/style.css",
  "src/tailwind.css",
  "app/tailwind.css",
  "index.css",
  "styles.css",
  "style.css",
];

const ANIMATE_LIBS = ["tw-animate-css", "tailwindcss-animate"] as const;

interface CssEntry {
  file: string;
  relative: string;
  text: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const readOrNull = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const readEntry = async (
  workTree: string,
  relative: string
): Promise<CssEntry | null> => {
  const file = path.join(workTree, relative);
  const text = await readOrNull(file);

  if (text === null) {
    return null;
  }

  return { file, relative, text };
};

const cssEntry = async (workTree: string): Promise<CssEntry | null> => {
  const found = await Promise.all(
    CSS_CANDIDATES.map((relative) => readEntry(workTree, relative))
  );

  return found.find((entry) => entry !== null) ?? null;
};

const parsePackage = (text: string | null): PackageJson => {
  if (text === null) {
    return {};
  }

  try {
    return JSON.parse(text) as PackageJson;
  } catch {
    return {};
  }
};

const inPackage = (pkg: PackageJson, name: string): boolean =>
  Boolean(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);

const hasAnimateLib = async (
  workTree: string,
  entry: CssEntry | null
): Promise<boolean> => {
  const pkg = parsePackage(
    await readOrNull(path.join(workTree, "package.json"))
  );

  return ANIMATE_LIBS.some(
    (name) => inPackage(pkg, name) || Boolean(entry?.text.includes(name))
  );
};

export { cssEntry, hasAnimateLib };

export type { CssEntry };
