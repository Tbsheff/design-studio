import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import { parseModuleFile } from "../components/index.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { toStrippedPage, toTidiedSource } from "./engine/index.js";
import type { ModuleFile } from "./engine/index.js";
import { FIXTURE_URL_SEGMENT } from "./fixture-model.js";
import type { CreateFixtureCommand, FixturePlan } from "./fixture-model.js";

interface ViteScope {
  readonly direction: Direction;
  readonly project: Project;
}

interface FoundText {
  readonly code: string;
  readonly relative: string;
}

const LABEL_MAX = 40;

const ENTRY_FILES = ["src/App.tsx", "src/App.jsx"] as const;

const MAIN_FILES = ["src/main.tsx", "src/main.jsx"] as const;

const toPosix = (value: string): string => value.split(path.sep).join("/");

const toTextOrNull = async (
  root: string,
  name: string
): Promise<FoundText | null> => {
  try {
    const code = await readFile(path.join(root, name), "utf-8");

    return { code, relative: name };
  } catch {
    return null;
  }
};

const toFirstText = async (
  root: string,
  names: readonly string[]
): Promise<FoundText | null> => {
  const found = await Promise.all(
    names.map((name) => toTextOrNull(root, name))
  );

  return found.find((item) => item !== null) ?? null;
};

const toSideEffectImports = (
  code: string,
  fromDir: string,
  toDir: string
): readonly string[] => {
  const parsed = parseModuleFile(code, "main.tsx");

  if (parsed === null) {
    return [];
  }

  return parsed.program.body.flatMap((statement) => {
    if (
      statement.type !== "ImportDeclaration" ||
      statement.specifiers.length > 0
    ) {
      return [];
    }

    const source = statement.source.value;

    if (!source.startsWith(".")) {
      return [`import "${source}";`];
    }

    const target = path.posix.join(fromDir, source);
    const moved = path.posix.relative(toDir, target);

    return [`import "${moved}";`];
  });
};

const LT = "<";

const toMainCode = (imports: readonly string[]): string =>
  [
    'import { StrictMode } from "react";',
    'import { createRoot } from "react-dom/client";',
    ...imports,
    'import Page from "./page";',
    "",
    'createRoot(document.getElementById("root")!).render(',
    `  ${LT}StrictMode>`,
    `    ${LT}Page />`,
    `  ${LT}/StrictMode>`,
    ");",
    "",
  ].join("\n");

const toHtmlCode = (label: string): string =>
  [
    `${LT}!doctype html>`,
    `${LT}html lang="en">`,
    `  ${LT}head>`,
    `    ${LT}meta charset="UTF-8" />`,
    `    ${LT}meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `    ${LT}title>${label}${LT}/title>`,
    `  ${LT}/head>`,
    `  ${LT}body>`,
    `    ${LT}div id="root">${LT}/div>`,
    `    ${LT}script type="module" src="./main.tsx">${LT}/script>`,
    `  ${LT}/body>`,
    `${LT}/html>`,
    "",
  ].join("\n");

const toRelativeDir = (workTree: string, file: string): string =>
  toPosix(path.dirname(path.relative(workTree, file)));

const toViteSource = async (
  appRoot: string,
  command: CreateFixtureCommand
): Promise<{
  readonly ast: ModuleFile;
  readonly code: string;
  readonly file: string;
}> => {
  if (command.route !== "/" && command.route.trim() !== "") {
    throw new BadRequestError(
      "A project without the Next.js app router has one page. Use the route /."
    );
  }

  const entry = await toFirstText(appRoot, ENTRY_FILES);

  if (entry === null) {
    throw new NotFoundError("The project has no src/App.tsx to copy.");
  }

  const file = path.join(appRoot, entry.relative);
  const ast = parseModuleFile(entry.code, file);

  if (ast === null) {
    throw new BadRequestError(`The page ${entry.relative} did not parse.`);
  }

  const { code } = entry;

  return { ast, code, file };
};

const toViteFixturePlan = async (
  scope: ViteScope,
  command: CreateFixtureCommand,
  id: string
): Promise<FixturePlan> => {
  const { direction, project } = scope;
  const appRoot = path.join(direction.workTree, project.app?.appDir ?? ".");
  const source = await toViteSource(appRoot, command);

  const stripped = toStrippedPage({
    ast: source.ast,
    code: source.code,
    params: command.params,
    searchParams: command.searchParams,
  });

  if (!stripped.isOk) {
    throw new BadRequestError(stripped.message);
  }

  const folderAbs = path.join(appRoot, FIXTURE_URL_SEGMENT, id);
  const folder = toPosix(path.relative(direction.workTree, folderAbs));
  const after = parseModuleFile(stripped.source, source.file);

  if (after === null) {
    throw new BadRequestError(
      "The fixture page did not parse after the server calls were removed."
    );
  }

  const page = toTidiedSource({
    after,
    afterCode: stripped.source,
    before: source.ast,
    fromDir: toRelativeDir(direction.workTree, source.file),
    toDir: folder,
  });

  const main = await toFirstText(appRoot, MAIN_FILES);
  const mainFile = path.join(appRoot, main?.relative ?? MAIN_FILES[0]);

  const imports = toSideEffectImports(
    main?.code ?? "",
    toRelativeDir(direction.workTree, mainFile),
    folder
  );

  const label = `Fixture ${command.route}`.slice(0, LABEL_MAX);

  const { removed, unresolved } = stripped;
  const url = `${FIXTURE_URL_SEGMENT}/${id}/`;

  const files = [
    { code: toHtmlCode(label), relative: `${folder}/index.html` },
    { code: toMainCode(imports), relative: `${folder}/main.tsx` },
    { code: page, relative: `${folder}/page.tsx` },
  ];

  return { files, folder, id, label, removed, unresolved, url };
};

export { toViteFixturePlan };
