import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SourceLoc } from "@design-studio/contracts";

import { parseSource } from "../direct-edit/engine/index.js";
import { EditError } from "./edit-error.js";

interface AstStart {
  readonly line: number;
  readonly column: number;
}

interface AstNode {
  readonly type: string | null;
  readonly loc: { readonly start: AstStart } | null;
}

type ParsedSource = ReturnType<typeof parseSource>;

const FULL = /^(?<file>.+):(?<line>\d+):(?<column>\d+)$/u;
const LINE_ONLY = /^(?<file>.+):(?<line>\d+)$/u;
const SCRIPT = /\.(?<extension>tsx|jsx|ts|js|mjs|cjs)$/u;
const FILES_MAX = 2000;
const shownFiles = new Map<string, Map<string, Set<string>>>();

const noteShownFiles = (scope: string, files: Iterable<string>): void => {
  let byBase = shownFiles.get(scope);

  if (!byBase || byBase.size > FILES_MAX) {
    byBase = new Map();
    shownFiles.set(scope, byBase);
  }

  for (const file of files) {
    const base = path.posix.basename(file);
    byBase.set(base, (byBase.get(base) ?? new Set()).add(file));
  }
};

const fullFile = (scope: string, file: string): string => {
  if (file.includes("/")) {
    return file;
  }

  const known = [...(shownFiles.get(scope)?.get(file) ?? [])];

  if (known.length === 1) {
    return known[0] as string;
  }

  return file;
};

const insideTree = (workTree: string, file: string): string => {
  const absolute = path.resolve(workTree, file);

  if (
    path.isAbsolute(file) ||
    file.split(/[\\/]/u).includes("..") ||
    !absolute.startsWith(workTree + path.sep)
  ) {
    throw new EditError(
      `${file} must be a path relative to the project folder.`
    );
  }

  return absolute;
};

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" && value !== null;

const toChildren = (node: AstNode): unknown[] => {
  const children: unknown[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key !== "loc") {
      children.push(value);
    }
  }

  return children;
};

const tagStartsOn = (root: ParsedSource, line: number): number[] => {
  const cols: number[] = [];
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();

    if (isAstNode(node)) {
      const start = node.loc?.start;

      if (node.type === "JSXOpeningElement" && start?.line === line) {
        cols.push(start.column + 1);
      }

      stack.push(...toChildren(node));
    }
  }

  return cols.toSorted((left, right) => left - right);
};

const toFileText = async (
  workTree: string,
  file: string
): Promise<string | null> => {
  try {
    return await readFile(insideTree(workTree, file), "utf-8");
  } catch {
    return null;
  }
};

const colOnLine = async (
  workTree: string,
  file: string,
  line: number,
  raw: string
): Promise<number> => {
  if (!SCRIPT.test(file)) {
    throw new EditError(
      `${raw}: pass file:line:col for a file that is not JSX.`
    );
  }

  const text = await toFileText(workTree, file);

  if (text === null) {
    throw new EditError(`${raw}: there is no file ${file} in the project.`);
  }

  const cols = tagStartsOn(parseSource(text, /\.tsx?$/u.test(file)), line);

  if (cols.length === 1) {
    return cols[0] as number;
  }

  if (cols.length === 0) {
    throw new EditError(
      `${raw}: no JSX tag starts on line ${line} of ${file}.`
    );
  }

  throw new EditError(
    `${raw}: ${cols.length} JSX tags start on line ${line} (columns ${cols.join(", ")}). Pass file:line:col, for example ${file}:${line}:${cols[0]}.`
  );
};

const resolveSourceLoc = async (
  workTree: string,
  scope: string,
  raw: string
): Promise<SourceLoc> => {
  const full = FULL.exec(raw.trim());

  if (full?.groups) {
    return {
      col: Number(full.groups.column),
      file: fullFile(scope, full.groups.file as string),
      line: Number(full.groups.line),
    };
  }

  const lineOnly = LINE_ONLY.exec(raw.trim());

  if (!lineOnly?.groups) {
    throw new EditError(
      "pass the source as file:line:col or file:line, for example src/App.tsx:12:7 (get_layers prints it)."
    );
  }

  const file = fullFile(scope, lineOnly.groups.file as string);
  const line = Number(lineOnly.groups.line);

  return { col: await colOnLine(workTree, file, line, raw), file, line };
};

export { noteShownFiles, resolveSourceLoc };
