import path from "node:path";

import { CritiqueSchema } from "@design-studio/actions/critique/schema";
import { Schema } from "effect";

import { toJsonFileReader } from "../platform/local-file/index.js";

const SavedCritiqueSchema = Schema.Struct({
  costUsd: Schema.Number,
  model: Schema.String,
  result: CritiqueSchema,
});

interface SavedKey {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

const toSavedPath = (dataDir: string, key: SavedKey): string =>
  path.join(
    dataDir,
    "critiques",
    key.projectId,
    key.directionId,
    `${key.frameId}.json`
  );

const readSavedCritique = toJsonFileReader(SavedCritiqueSchema);

export { readSavedCritique, SavedCritiqueSchema, toSavedPath };

export type { SavedKey };
