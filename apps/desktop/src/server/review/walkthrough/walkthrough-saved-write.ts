import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SavedWalkthroughSchema } from "./walkthrough-saved.js";

type SavedWalkthrough = typeof SavedWalkthroughSchema.Type;

const createSavedWalkthrough = async (
  file: string,
  saved: SavedWalkthrough
): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });

  const pending = `${file}.${process.pid}.tmp`;

  await writeFile(pending, `${JSON.stringify(saved, null, 2)}\n`);
  await rename(pending, file);
};

const createWalkthroughFolder = async (folder: string): Promise<void> => {
  await mkdir(folder, { recursive: true });
};

export { createSavedWalkthrough, createWalkthroughFolder };

export type { SavedWalkthrough };
