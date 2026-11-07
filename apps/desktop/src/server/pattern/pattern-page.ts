import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  ConflictError,
  appRouterDir,
  applySplices,
  indentUnit,
  loadLibrary,
  normalize,
  parseHtmlSnippet,
  parseModuleFile,
  refuse,
} from "./deps.js";
import type { InsertScope } from "./deps.js";
import { getPatternImports } from "./pattern-imports.js";
import type { StoredPattern } from "./pattern-model.js";
import type { PatternPlan } from "./pattern-plan.js";
import type { Prepared } from "./pattern-prepare.js";

const SEGMENT = /^(?:\([a-z0-9_-]+\)|\[[a-z0-9_-]+\]|[a-z0-9][a-z0-9_-]*)$/u;

const MARK = "__PATTERN__";

const PAGE_FILES = ["page.tsx", "page.jsx", "page.ts", "page.js"] as const;

const BODY_INDENT = "      ";

const LT = "<";

const hasPath = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

const getText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toSegments = (page: string): readonly string[] => {
  const segments = page
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment !== "");

  if (
    segments.length === 0 ||
    !segments.every((segment) => SEGMENT.test(segment))
  ) {
    throw refuse(
      `"${page}" is not a page route. Use lowercase words with - or _, split by /, for example reports/table.`
    );
  }

  return segments;
};

const toComponentName = (segments: readonly string[]): string => {
  const last =
    segments.findLast((segment) => /^[a-z0-9]/u.test(segment)) ?? "pattern";

  const name = last
    .split(/[^a-z0-9]+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  if (name === "") {
    return "PatternPage";
  }

  if (/^\d/u.test(name)) {
    return `Page${name}Page`;
  }

  return `${name}Page`;
};

const toStub = (name: string): string =>
  `export default function ${name}() {\n  return (\n    <>\n${BODY_INDENT}${MARK}\n    </>\n  );\n}\n`;

const toIndented = (text: string): string =>
  text
    .split("\n")
    .map((line, index) => {
      if (index === 0 || line === "") {
        return line;
      }

      return `${BODY_INDENT}${line}`;
    })
    .join("\n");

const toGroupSegments = (
  scope: InsertScope,
  stored: StoredPattern,
  routerDir: string
): readonly string[] => {
  if (stored.sourceProjectId !== scope.project.id) {
    return [];
  }

  const inside = path
    .relative(routerDir, path.join(scope.workTree, stored.sourceFile))
    .split(path.sep);

  const groups: string[] = [];

  for (const part of inside) {
    if (!/^\(.+\)$/u.test(part)) {
      break;
    }

    groups.push(part);
  }

  return groups;
};

const getRouterFile = async (
  scope: InsertScope,
  stored: StoredPattern,
  segments: readonly string[]
): Promise<string> => {
  const appRoot = path.join(scope.workTree, scope.project.app?.appDir ?? ".");
  const routerDir = appRouterDir(appRoot);

  if (routerDir === null) {
    throw refuse(
      "This project has no Next.js app router folder (app or src/app), so a new page has no place to go. Insert at a layer instead."
    );
  }

  const folder = path.join(
    routerDir,
    ...toGroupSegments(scope, stored, routerDir),
    ...segments
  );

  const found = await Promise.all(
    PAGE_FILES.map((name) => hasPath(path.join(folder, name)))
  );

  if (found.some(Boolean)) {
    throw new ConflictError(
      `The route /${segments.join("/")} exists already. Pick another page name.`
    );
  }

  return path.join(folder, "page.tsx");
};

const insertReactPage = async (
  scope: InsertScope,
  stored: StoredPattern,
  prepared: Prepared,
  page: string
): Promise<PatternPlan> => {
  if (scope.project.app?.framework !== "next") {
    throw refuse(
      "A new page needs a Next.js app router project. Insert at a layer instead."
    );
  }

  const segments = toSegments(page);
  const file = await getRouterFile(scope, stored, segments);
  const stub = toStub(toComponentName(segments));
  const module = parseModuleFile(stub, file);

  if (module === null) {
    throw refuse("The studio could not build the new page file.");
  }

  const kit = await loadLibrary(scope.project, scope.workTree);

  const edits = await getPatternImports({
    ast: module,
    code: stub,
    helpers: prepared.helpers,
    isPlanned: true,
    library: kit,
    mapped: prepared.mapping.mapped,
    project: scope.project,
    targetFile: file,
  });

  const withImports = applySplices(stub, [...edits.splices]);
  const body = toIndented(normalize(prepared.text, "", "  "));
  let head = "";

  if (stored.isClient) {
    head = '"use client";\n\n';
  }

  const relative = path
    .relative(scope.workTree, file)
    .split(path.sep)
    .join("/");

  const visible = segments.filter((segment) => !segment.startsWith("("));

  return {
    addedImports: edits.added,
    code: `${head}${withImports.replace(MARK, () => body)}`,
    isNew: true,
    original: "",
    route: `/${visible.join("/")}`,
    target: { file, relative },
    title: `Insert pattern ${stored.name} as page /${segments.join("/")}`,
    unresolved: stored.references,
  };
};

const toEscaped = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll(LT, "&lt;").replaceAll(">", "&gt;");

const toElement = (tag: string, inner: string): string =>
  `${LT}${tag}>${inner}${LT}/${tag}>`;

const toSkeleton = (name: string, body: string): string =>
  [
    `${LT}!doctype html>`,
    `${LT}html lang="en">`,
    toElement(
      "head",
      `\n  ${LT}meta charset="utf-8">\n  ${LT}meta name="viewport" content="width=device-width, initial-scale=1">\n  ${toElement("title", toEscaped(name))}\n`
    ),
    toElement("body", `\n${body}\n`),
    `${LT}/html>`,
    "",
  ].join("\n");

const toShell = (base: string | null, name: string, body: string): string => {
  const lower = base?.toLowerCase() ?? "";
  const openAt = lower.indexOf(`${LT}body`);
  const closeAt = lower.lastIndexOf(`${LT}/body>`);
  const openEnd = lower.indexOf(">", openAt) + 1;

  if (base === null || openAt === -1 || closeAt < openEnd) {
    return toSkeleton(name, body);
  }

  const withBody = `${base.slice(0, openEnd)}\n${body}\n${base.slice(closeAt)}`;
  const titleOpen = withBody.toLowerCase().indexOf(`${LT}title>`);
  const titleClose = withBody.toLowerCase().indexOf(`${LT}/title>`);

  if (titleOpen === -1 || titleClose < titleOpen) {
    return withBody;
  }

  const afterOpen = titleOpen + `${LT}title>`.length;

  return `${withBody.slice(0, afterOpen)}${toEscaped(name)}${withBody.slice(titleClose)}`;
};

const insertHtmlPage = async (
  scope: InsertScope,
  stored: StoredPattern,
  prepared: Prepared,
  page: string
): Promise<PatternPlan> => {
  const segments = toSegments(page);

  if (segments.length !== 1) {
    throw refuse(
      "A static project takes a one-word page name, for example reports."
    );
  }

  const slug = segments.join("");
  const file = path.join(scope.workTree, `${slug}.html`);

  if (await hasPath(file)) {
    throw new ConflictError(
      `${slug}.html exists already. Pick another page name.`
    );
  }

  const base = await getText(path.join(scope.workTree, "index.html"));
  let unit = "  ";

  if (base !== null) {
    unit = indentUnit(base);
  }

  const snippet = parseHtmlSnippet(prepared.text, unit);

  const body = snippet.pieces
    .map((piece) =>
      piece
        .split("\n")
        .map((line) => {
          if (line === "") {
            return line;
          }

          return `${unit}${unit}${line}`;
        })
        .join("\n")
    )
    .join("\n");

  return {
    addedImports: [],
    code: toShell(base, stored.name, body),
    isNew: true,
    original: "",
    route: `/${slug}.html`,
    target: { file, relative: `${slug}.html` },
    title: `Insert pattern ${stored.name} as page ${slug}.html`,
    unresolved: [],
  };
};

export { insertHtmlPage, insertReactPage };
