import { copyFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { userGit } from "../platform/git/index.js";

interface RouteSnapshot {
  readonly tree: string;
  readonly workTree: string;
}

interface TreeChange {
  readonly file: string;
  readonly status: string;
}

const ADD_TIMEOUT_MS = 60_000;

const ADDED = "A";

const toGitDir = async (workTree: string): Promise<string | null> => {
  const found = await userGit(workTree, ["rev-parse", "--absolute-git-dir"], {
    allowFail: true,
  });

  if (found.code !== 0) {
    return null;
  }

  return found.stdout.trim();
};

const createIndexCopy = async (from: string, to: string): Promise<boolean> => {
  try {
    await copyFile(from, to);

    return true;
  } catch {
    return false;
  }
};

const createTree = async (
  workTree: string,
  gitDir: string
): Promise<string | null> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "port-snapshot-"));
  const index = path.join(dir, "index");
  const indexEnv = { GIT_INDEX_FILE: index };

  try {
    await createIndexCopy(path.join(gitDir, "index"), index);

    const added = await userGit(workTree, ["add", "-A"], {
      allowFail: true,
      env: indexEnv,
      timeoutMs: ADD_TIMEOUT_MS,
    });

    if (added.code !== 0) {
      return null;
    }

    const written = await userGit(workTree, ["write-tree"], {
      allowFail: true,
      env: indexEnv,
    });

    if (written.code !== 0) {
      return null;
    }

    return written.stdout.trim();
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

const createRouteSnapshot = async (
  workTree: string
): Promise<RouteSnapshot | null> => {
  try {
    const gitDir = await toGitDir(workTree);

    if (gitDir === null) {
      return null;
    }

    const tree = await createTree(workTree, gitDir);

    if (tree === null) {
      return null;
    }

    return { tree, workTree };
  } catch {
    return null;
  }
};

const toTreeChanges = (text: string): TreeChange[] => {
  const parts = text.split("\0").filter((part) => part !== "");
  const changes: TreeChange[] = [];

  for (let at = 0; at + 1 < parts.length; at += 2) {
    changes.push({ file: parts[at + 1] ?? "", status: parts[at] ?? "" });
  }

  return changes;
};

const listTreeChanges = async (
  snapshot: RouteSnapshot,
  tree: string
): Promise<TreeChange[] | null> => {
  const found = await userGit(
    snapshot.workTree,
    [
      "diff-tree",
      "-r",
      "-z",
      "--no-renames",
      "--name-status",
      snapshot.tree,
      tree,
    ],
    { allowFail: true }
  );

  if (found.code !== 0) {
    return null;
  }

  return toTreeChanges(found.stdout);
};

const restoreFiles = async (
  snapshot: RouteSnapshot,
  files: readonly string[]
): Promise<boolean> => {
  if (files.length === 0) {
    return true;
  }

  const restored = await userGit(
    snapshot.workTree,
    ["restore", `--source=${snapshot.tree}`, "--worktree", "--", ...files],
    { allowFail: true }
  );

  return restored.code === 0;
};

const deleteFiles = async (
  snapshot: RouteSnapshot,
  files: readonly string[]
): Promise<void> => {
  await Promise.all(
    files.map((file) => rm(path.join(snapshot.workTree, file), { force: true }))
  );
};

const restoreRouteSnapshot = async (
  snapshot: RouteSnapshot
): Promise<boolean> => {
  try {
    const gitDir = await toGitDir(snapshot.workTree);

    if (gitDir === null) {
      return false;
    }

    const now = await createTree(snapshot.workTree, gitDir);

    if (now === null) {
      return false;
    }

    const changes = await listTreeChanges(snapshot, now);

    if (changes === null) {
      return false;
    }

    const added = changes.filter((change) => change.status === ADDED);
    const changed = changes.filter((change) => change.status !== ADDED);

    await deleteFiles(
      snapshot,
      added.map((change) => change.file)
    );

    return await restoreFiles(
      snapshot,
      changed.map((change) => change.file)
    );
  } catch {
    return false;
  }
};

export { createRouteSnapshot, restoreRouteSnapshot };

export type { RouteSnapshot };
