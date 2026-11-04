import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SavedCritiqueSchema } from "./critique-saved.js";

type SavedCritique = typeof SavedCritiqueSchema.Type;

const createSavedCritique = async (
  file: string,
  saved: SavedCritique
): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });

  const pending = `${file}.${process.pid}.tmp`;

  await writeFile(pending, `${JSON.stringify(saved, null, 2)}\n`);
  await rename(pending, file);
};

export { createSavedCritique };

export type { SavedCritique };
