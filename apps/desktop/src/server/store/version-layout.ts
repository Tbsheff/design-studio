import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

interface LayoutEntry {
  readonly relative: string;
  readonly target: string;
  readonly bytes: Buffer | null;
}

type LiveLayout = readonly LayoutEntry[];

const toLayoutTarget = (workTree: string, relative: string): string =>
  path.join(workTree, ...relative.split("/"));

const getBytes = async (target: string): Promise<Buffer | null> => {
  try {
    return await readFile(target);
  } catch {
    return null;
  }
};

const toLiveLayout = (
  files: readonly string[],
  workTree: string
): Promise<LiveLayout> =>
  Promise.all(
    files.map(async (relative) => {
      const target = toLayoutTarget(workTree, relative);
      const bytes = await getBytes(target);

      return { bytes, relative, target };
    })
  );

const toStoredLayout = (
  live: LiveLayout,
  getStored: (relative: string) => Promise<Buffer | null>
): Promise<LiveLayout> =>
  Promise.all(
    live.map(async (entry) => {
      const stored = await getStored(entry.relative);

      if (stored === null) {
        return entry;
      }

      return { ...entry, bytes: stored };
    })
  );

const applyEntry = async (
  entry: LayoutEntry,
  shouldRemoveMissing: boolean
): Promise<void> => {
  if (entry.bytes !== null) {
    await mkdir(path.dirname(entry.target), { recursive: true });
    await writeFile(entry.target, entry.bytes);

    return;
  }

  if (shouldRemoveMissing) {
    await rm(entry.target, { force: true });
  }
};

const applyLayout = async (
  live: LiveLayout,
  shouldRemoveMissing: boolean
): Promise<void> => {
  await Promise.all(
    live.map((entry) => applyEntry(entry, shouldRemoveMissing))
  );
};

export { applyLayout, toLiveLayout, toStoredLayout };

export type { LiveLayout };
