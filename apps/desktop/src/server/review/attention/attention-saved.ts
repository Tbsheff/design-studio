import path from "node:path";

import { AttentionResultSchema } from "@design-studio/actions/critique/schema";

import { toJsonFileReader } from "../../platform/local-file/index.js";

interface SavedKey {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

const toSavedPath = (dataDir: string, key: SavedKey): string =>
  path.join(
    dataDir,
    "attention",
    key.projectId,
    key.directionId,
    `${key.frameId}.json`
  );

const readSavedAttention = toJsonFileReader(AttentionResultSchema);

export { readSavedAttention, toSavedPath };

export type { SavedKey };
