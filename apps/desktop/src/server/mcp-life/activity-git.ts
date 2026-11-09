import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { ActivityBranch } from "@design-studio/actions/studio/schema";

const REF_PREFIX = "ref: refs/heads/";
const GITDIR_PREFIX = "gitdir:";
const SHORT_SHA = 7;
const MAX_DEPTH = 8;

const getText = async (file: string): Promise<string | null> => {
  try {
    const text = await readFile(file, "utf-8");

    return text.trim();
  } catch {
    return null;
  }
};

const isDirectory = async (target: string): Promise<boolean> => {
  try {
    const info = await stat(target);

    return info.isDirectory();
  } catch {
    return false;
  }
};

const toGitDir = async (folder: string): Promise<string | null> => {
  const dotGit = path.join(folder, ".git");

  if (await isDirectory(dotGit)) {
    return dotGit;
  }

  const pointer = await getText(dotGit);

  if (pointer === null || !pointer.startsWith(GITDIR_PREFIX)) {
    return null;
  }

  return path.resolve(folder, pointer.slice(GITDIR_PREFIX.length).trim());
};

const searchGitDir = async (
  folder: string,
  depth: number
): Promise<string | null> => {
  const found = await toGitDir(folder);
  const parent = path.dirname(folder);

  if (found !== null || parent === folder || depth >= MAX_DEPTH) {
    return found;
  }

  return searchGitDir(parent, depth + 1);
};

const toBranchName = (head: string): string => {
  if (head.startsWith(REF_PREFIX)) {
    return head.slice(REF_PREFIX.length);
  }

  return head.slice(0, SHORT_SHA);
};

const getBranch = async (folder: string): Promise<ActivityBranch | null> => {
  const gitDir = await searchGitDir(folder, 0);

  if (gitDir === null) {
    return null;
  }

  const head = await getText(path.join(gitDir, "HEAD"));

  if (head === null || head === "") {
    return null;
  }

  return { branch: toBranchName(head), folder };
};

const getBranches = async (
  folders: readonly string[]
): Promise<ActivityBranch[]> => {
  const found = await Promise.all(folders.map((folder) => getBranch(folder)));

  return found.filter((entry) => entry !== null);
};

export { getBranches };
