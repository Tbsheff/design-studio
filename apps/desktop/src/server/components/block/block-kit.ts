import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadLibrary } from "./deps.js";
import type { LibraryEntry, Project } from "./deps.js";

interface BlockKit {
  readonly available: ReadonlySet<string>;
  readonly imports: Readonly<Record<string, string>>;
  readonly isHtml: boolean;
  readonly isTailwind: boolean;
}

const KIT_FOLDER = /(?:^|\/)(?:ui|components\/ui)\//u;

const hasTailwind = async (
  project: Project,
  workTree: string
): Promise<boolean> => {
  try {
    const text = await readFile(
      path.join(workTree, project.entry.replace(/^\//u, "")),
      "utf-8"
    );

    return /tailwind/iu.test(text);
  } catch {
    return false;
  }
};

const toRank = (entry: LibraryEntry): number => {
  if (KIT_FOLDER.test(entry.file)) {
    return 0;
  }

  return 1;
};

const toPicked = (
  entries: readonly LibraryEntry[],
  name: string
): LibraryEntry | null => {
  const found = entries
    .filter((entry) => entry.name === name)
    .toSorted((left, right) => toRank(left) - toRank(right));

  return found.at(0) ?? null;
};

const inspectBlockKit = async (
  project: Project,
  workTree: string,
  names: readonly string[]
): Promise<BlockKit> => {
  if (project.kind !== "react") {
    return {
      available: new Set(),
      imports: {},
      isHtml: true,
      isTailwind: await hasTailwind(project, workTree),
    };
  }

  const library = await loadLibrary(project, workTree);
  const available = new Set<string>();
  const imports: Record<string, string> = {};

  for (const name of names) {
    const picked = toPicked(library.entries, name);

    if (picked !== null) {
      available.add(name);
      imports[name] = picked.file;
    }
  }

  return { available, imports, isHtml: false, isTailwind: true };
};

export { inspectBlockKit };

export type { BlockKit };
