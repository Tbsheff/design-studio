import { readFile } from "node:fs/promises";
import path from "node:path";

import type { InsertTarget } from "@design-studio/contracts/insert";

import type { Project } from "./deps.js";

interface Candidate {
  readonly code: string;
  readonly file: string;
}

const HTML_FILE = /\.html?$/iu;

const MAIN_TAG = /<main[\s>]/iu;

const PAGE_FILES = [
  "app/page.tsx",
  "app/page.jsx",
  "src/app/page.tsx",
  "src/app/page.jsx",
  "pages/index.tsx",
  "pages/index.jsx",
  "src/pages/index.tsx",
  "src/pages/index.jsx",
  "src/App.tsx",
  "src/App.jsx",
];

const toEntryFiles = (project: Project): string[] => {
  const appDir = project.app?.appDir ?? ".";
  const entry = project.entry.replace(/^\//u, "");

  if (HTML_FILE.test(entry)) {
    return [entry];
  }

  return PAGE_FILES.map((file) => path.posix.join(appDir, file));
};

const toCandidate = async (
  workTree: string,
  file: string
): Promise<Candidate | null> => {
  try {
    const code = await readFile(path.join(workTree, file), "utf-8");

    return { code, file };
  } catch {
    return null;
  }
};

const toMainLocation = (candidate: Candidate): InsertTarget["source"] => {
  const found = MAIN_TAG.exec(candidate.code);

  if (found === null) {
    return null;
  }

  const before = candidate.code.slice(0, found.index).split("\n");
  const col = (before.at(-1) ?? "").length + 1;
  const { file } = candidate;

  return { col, file, line: before.length };
};

const getMainTarget = async (
  project: Project,
  workTree: string
): Promise<InsertTarget["source"]> => {
  const read = await Promise.all(
    toEntryFiles(project).map((file) => toCandidate(workTree, file))
  );

  for (const candidate of read) {
    const found = candidate && toMainLocation(candidate);

    if (found) {
      return found;
    }
  }

  return null;
};

export { getMainTarget };
