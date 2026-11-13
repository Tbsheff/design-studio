import { access, rm } from "node:fs/promises";
import path from "node:path";

import { runGit } from "../platform/git/index.js";
import type { GitScope } from "../platform/git/index.js";

const LITERAL = "--literal-pathspecs";

const isPresent = async (workTree: string, item: string): Promise<boolean> => {
  try {
    await access(path.join(workTree, item));

    return true;
  } catch {
    return false;
  }
};

const updatePathsWith = async (
  scope: GitScope,
  paths: readonly string[],
  addFlags: readonly string[]
): Promise<void> => {
  const workTree = scope.workTree ?? "";

  const found = await Promise.all(
    paths.map((item) => isPresent(workTree, item))
  );

  const present = paths.filter((_item, at) => found[at] === true);
  const missing = paths.filter((_item, at) => found[at] !== true);

  if (present.length > 0) {
    await runGit(scope, [LITERAL, "add", ...addFlags, "--", ...present]);
  }

  if (missing.length > 0) {
    await runGit(scope, [
      LITERAL,
      "rm",
      "-r",
      "--cached",
      "--ignore-unmatch",
      "--quiet",
      "--",
      ...missing,
    ]);
  }
};

const updateIndexPaths = (
  scope: GitScope,
  paths: readonly string[]
): Promise<void> => updatePathsWith(scope, paths, ["-A"]);

const updateLayoutPaths = (
  scope: GitScope,
  paths: readonly string[]
): Promise<void> => updatePathsWith(scope, paths, ["-f"]);

const updateSplitPaths = async (
  scope: GitScope,
  paths: readonly string[],
  layout: readonly string[]
): Promise<void> => {
  const layoutSet = new Set(layout);
  const plain = paths.filter((item) => !layoutSet.has(item));
  const forced = paths.filter((item) => layoutSet.has(item));

  if (plain.length > 0) {
    await updateIndexPaths(scope, plain);
  }

  if (forced.length > 0) {
    await updateLayoutPaths(scope, forced);
  }
};

const toNulList = (text: string): string[] =>
  text.split("\0").filter((entry) => entry !== "");

const listStageable = async (
  scope: GitScope,
  paths: string[]
): Promise<string[]> => {
  const { stdout } = await runGit(scope, [
    LITERAL,
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ...paths,
  ]);

  const listed = toNulList(stdout);
  const exact = new Set(listed);

  return paths.filter(
    (relative) =>
      exact.has(relative) ||
      listed.some((entry) => entry.startsWith(`${relative}/`))
  );
};

const listChangedAmong = async (
  base: GitScope,
  indexFile: string,
  head: string,
  paths: string[]
): Promise<string[]> => {
  if (paths.length === 0) {
    return [];
  }

  const scope: GitScope = { ...base, indexFile };

  try {
    await runGit(scope, ["read-tree", head]);
    const stageable = await listStageable(scope, paths);

    if (stageable.length > 0) {
      await updateIndexPaths(scope, stageable);
    }

    const { stdout } = await runGit(scope, [
      LITERAL,
      "diff-index",
      "--cached",
      "--name-only",
      "-z",
      head,
      "--",
      ...paths,
    ]);

    return toNulList(stdout);
  } finally {
    await rm(indexFile, { force: true });
  }
};

export {
  listChangedAmong,
  listStageable,
  updateIndexPaths,
  updateLayoutPaths,
  updateSplitPaths,
};
