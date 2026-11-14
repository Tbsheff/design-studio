import { readFile } from "node:fs/promises";

import { patchSource, resolveSource, themeForFile } from "./deps.js";
import type { DirectEditRequest, StackingScope, WrittenFile } from "./deps.js";

const toLayersTitle = (title: string, layers: number): string => {
  if (layers <= 1) {
    return title;
  }

  return `${title} on ${layers} layers`;
};

const toLaterFirst = (one: DirectEditRequest, two: DirectEditRequest): number =>
  two.source.line - one.source.line || two.source.col - one.source.col;

const toFileGroups = (
  edits: readonly DirectEditRequest[]
): ReadonlyMap<string, DirectEditRequest[]> => {
  const groups = new Map<string, DirectEditRequest[]>();

  for (const edit of edits) {
    const group = groups.get(edit.source.file) ?? [];

    group.push(edit);
    groups.set(edit.source.file, group);
  }

  return groups;
};

const toLayerFile = async (
  scope: StackingScope,
  file: string,
  edits: readonly DirectEditRequest[]
): Promise<WrittenFile | null> => {
  const target = await resolveSource(scope.workTree, file);
  const original = await readFile(target.file, "utf-8");

  const theme = await themeForFile(scope.workTree, target.relative, original, {
    projectKind: scope.project.kind,
  });

  let code = original;

  for (const edit of edits.toSorted(toLaterFirst)) {
    ({ code } = patchSource(target.relative, code, edit, theme));
  }

  if (code === original) {
    return null;
  }

  return { code, original, target };
};

const toLayerFiles = async (
  scope: StackingScope,
  edits: readonly DirectEditRequest[]
): Promise<WrittenFile[]> => {
  const groups = [...toFileGroups(edits)];

  const done = await Promise.all(
    groups.map(([file, group]) => toLayerFile(scope, file, group))
  );

  return done.filter((entry) => entry !== null);
};

export { toLayerFiles, toLayersTitle };
