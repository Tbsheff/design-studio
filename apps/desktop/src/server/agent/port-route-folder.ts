import { readFile } from "node:fs/promises";
import path from "node:path";

import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

interface RouteFolderFile {
  readonly file: string;
  readonly text: string;
}

const FOLDER_FILE_MAX = 3;

const FOLDER_IMPORT = /\bfrom\s+["']\.\/(?<name>[\w.-]+)["']/gu;

const CODE_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js"];

const GLOBAL_CSS = [
  "app/globals.css",
  "src/app/globals.css",
  "styles/globals.css",
];

const PACKAGE_FILE = "package.json";

const VERSION_DIGITS = /\d+/u;

const PackageSchema = Schema.Struct({
  dependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  devDependencies: Schema.optionalKey(
    Schema.Record(Schema.String, Schema.String)
  ),
});

const decodePackage = toDecoder(Schema.fromJsonString(PackageSchema), "ignore");

const getText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toImportNames = (text: string): string[] => [
  ...new Set(
    [...text.matchAll(FOLDER_IMPORT)].map(
      (found) => found.groups?.["name"] ?? ""
    )
  ),
];

const toCandidates = (folder: string, name: string): string[] => {
  if (path.extname(name) !== "") {
    return [path.join(folder, name)];
  }

  return CODE_EXTENSIONS.map((extension) =>
    path.join(folder, `${name}${extension}`)
  );
};

const getFirstText = async (
  root: string,
  files: readonly string[]
): Promise<RouteFolderFile | null> => {
  const texts = await Promise.all(
    files.map((file) => getText(path.join(root, file)))
  );

  const index = texts.findIndex((text) => text !== null);

  if (index === -1) {
    return null;
  }

  return { file: files[index] ?? "", text: texts[index] ?? "" };
};

const isCodeFile = (file: RouteFolderFile): boolean =>
  CODE_EXTENSIONS.includes(path.extname(file.file));

const listRouteFolderFiles = async (
  workTree: string,
  routeFile: string,
  routeText: string
): Promise<RouteFolderFile[]> => {
  const folder = path.dirname(routeFile);

  const found = await Promise.all(
    toImportNames(routeText).map((name) =>
      getFirstText(workTree, toCandidates(folder, name))
    )
  );

  const files = found.filter((file) => file !== null);

  return [
    ...files.filter((file) => isCodeFile(file)),
    ...files.filter((file) => !isCodeFile(file)),
  ].slice(0, FOLDER_FILE_MAX);
};

const toPackageFolders = (workTree: string, routeFile: string): string[] => {
  const folders: string[] = [];
  let folder = path.dirname(path.join(workTree, routeFile));

  while (folder.startsWith(workTree)) {
    folders.push(folder);

    if (folder === workTree) {
      break;
    }

    folder = path.dirname(folder);
  }

  return folders;
};

const getPackageRoot = async (
  workTree: string,
  routeFile: string
): Promise<{ readonly root: string; readonly text: string } | null> => {
  const found = await getFirstText(
    workTree,
    toPackageFolders(workTree, routeFile).map((folder) =>
      path.relative(workTree, path.join(folder, PACKAGE_FILE))
    )
  );

  if (found === null) {
    return null;
  }

  return {
    root: path.join(workTree, path.dirname(found.file)),
    text: found.text,
  };
};

const toTailwindMajor = (packageText: string): string | null => {
  const decoded = decodePackage(packageText);

  if (Result.isFailure(decoded)) {
    return null;
  }

  const all = {
    ...decoded.success.dependencies,
    ...decoded.success.devDependencies,
  };

  const version = all["tailwindcss"] ?? all["@tailwindcss/postcss"] ?? null;

  if (version === null) {
    return null;
  }

  return VERSION_DIGITS.exec(version)?.[0] ?? "";
};

const toTailwindLine = (major: string): string => {
  const name = `Tailwind ${major}`.trim();

  return `Style stack: ${name}, from package.json. Style with Tailwind classes and the app theme tokens.`;
};

const getGlobalCss = async (root: string): Promise<string | null> => {
  const found = await getFirstText(root, GLOBAL_CSS);

  return found?.file ?? null;
};

const toStyleStackLine = async (
  workTree: string,
  routeFile: string,
  folderFiles: readonly RouteFolderFile[]
): Promise<string> => {
  const found = await getPackageRoot(workTree, routeFile);
  const major = toTailwindMajor(found?.text ?? "{}");

  if (major !== null) {
    return toTailwindLine(major);
  }

  if (folderFiles.some((file) => file.file.includes(".module."))) {
    return "Style stack: CSS modules, no Tailwind. Style with the CSS module that the route folder uses.";
  }

  const globalCss = await getGlobalCss(found?.root ?? workTree);

  if (globalCss !== null) {
    return `Style stack: no Tailwind, plain CSS in ${globalCss}. Style with what the route uses now: a CSS module next to the route or inline styles. Tailwind classes do nothing in this app.`;
  }

  return "This app has no Tailwind. Style with what the route uses now.";
};

export { listRouteFolderFiles, toStyleStackLine };

export type { RouteFolderFile };
