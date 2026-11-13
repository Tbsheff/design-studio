import { readFile } from "node:fs/promises";

import {
  SOURCE_LOC_ATTR,
  parseDirectEditRequest,
  patchSource,
  publishVersion,
  resolveSource,
  themeForFile,
  writeAndCommitAll,
} from "./deps.js";
import type {
  DirectEditRequest,
  DirectionRun,
  SourceLoc,
  TailwindTheme,
  WrittenFile,
} from "./deps.js";

type LayoutStyle = DirectEditRequest["style"];

type FileWork = WrittenFile & { readonly theme: TailwindTheme | null };

interface ChildEdit {
  readonly loc: SourceLoc;
  readonly style: LayoutStyle;
}

const toLocText = (loc: SourceLoc): string =>
  `${loc.file}:${loc.line}:${loc.col}`;

const toLocSelector = (loc: SourceLoc): string =>
  `[${SOURCE_LOC_ATTR}="${toLocText(loc)}"]`;

const toFileWork = async (
  run: DirectionRun,
  works: Map<string, FileWork>,
  file: string
): Promise<FileWork> => {
  const known = works.get(file);

  if (known) {
    return known;
  }

  const target = await resolveSource(run.direction.workTree, file);
  const original = await readFile(target.file, "utf-8");

  const theme = await themeForFile(
    run.direction.workTree,
    target.relative,
    original,
    { projectKind: run.project.kind }
  );

  const work = { code: original, original, target, theme };

  works.set(file, work);

  return work;
};

const toPatchedWork = (
  work: FileWork,
  edits: readonly ChildEdit[]
): FileWork => {
  const sorted = edits.toSorted(
    (first, second) =>
      second.loc.line - first.loc.line || second.loc.col - first.loc.col
  );

  let { code } = work;

  for (const edit of sorted) {
    const request = parseDirectEditRequest({
      selector: toLocSelector(edit.loc),
      source: edit.loc,
      style: edit.style,
    });

    ({ code } = patchSource(work.target.relative, code, request, work.theme));
  }

  return { ...work, code };
};

const toEditsByFile = (
  edits: readonly ChildEdit[]
): Map<string, ChildEdit[]> => {
  const byFile = new Map<string, ChildEdit[]>();

  for (const edit of edits) {
    byFile.set(edit.loc.file, [...(byFile.get(edit.loc.file) ?? []), edit]);
  }

  return byFile;
};

const toCommitted = async (
  run: DirectionRun,
  changed: readonly FileWork[],
  title: string
): Promise<string> => {
  const deps = run.runtime.editDeps;

  const files = changed.map(({ code, original, target }) => ({
    code,
    original,
    target,
  }));

  const version = await writeAndCommitAll(
    deps,
    run.project,
    run.direction,
    files,
    title,
    { kind: "manual", prompt: title }
  );

  deps.history?.record({
    directionId: run.direction.id,
    files: files.map((file) => ({
      after: file.code,
      before: file.original,
      file: file.target.file,
      relative: file.target.relative,
    })),
    label: version.title,
    projectId: run.project.id,
    versionId: version.id,
  });

  await publishVersion(deps, run.project, run.direction, version);

  return version.id;
};

export { toCommitted, toEditsByFile, toFileWork, toPatchedWork };

export type { ChildEdit, FileWork, LayoutStyle };
