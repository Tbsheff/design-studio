import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AttentionResultSchema } from "@design-studio/actions/critique/schema";

type SavedAttention = typeof AttentionResultSchema.Type;

const createSavedAttention = async (
  file: string,
  saved: SavedAttention
): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });

  const pending = `${file}.${process.pid}.tmp`;

  await writeFile(pending, `${JSON.stringify(saved, null, 2)}\n`);
  await rename(pending, file);
};

export { createSavedAttention };

export type { SavedAttention };
