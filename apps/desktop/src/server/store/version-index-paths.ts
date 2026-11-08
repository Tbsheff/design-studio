import { access } from "node:fs/promises";
import path from "node:path";

import { runGit } from "../platform/git/index.js";
import type { GitScope } from "../platform/git/index.js";

const isPresent = async (workTree: string, item: string): Promise<boolean> => {
  try {
    await access(path.join(workTree, item));

    return true;
  } catch {
    return false;
  }
};

const updateIndexPaths = async (
  scope: GitScope,
  paths: readonly string[]
): Promise<void> => {
  const workTree = scope.workTree ?? "";

  const found = await Promise.all(
    paths.map((item) => isPresent(workTree, item))
  );

  const present = paths.filter((_item, at) => found[at] === true);
  const missing = paths.filter((_item, at) => found[at] !== true);

  if (present.length > 0) {
    await runGit(scope, ["--literal-pathspecs", "add", "-A", "--", ...present]);
  }

  if (missing.length > 0) {
    await runGit(scope, [
      "--literal-pathspecs",
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

export { updateIndexPaths };
