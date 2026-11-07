import path from "node:path";

import { PatternDetailSchema } from "@design-studio/actions/pattern/schema";
import { Effect } from "effect";

import { listFileNames, toJsonFileReader } from "./deps.js";
import type { StoredPattern } from "./pattern-model.js";
import {
  JSON_SUFFIX,
  toPatternFile,
  toPatternFolder,
} from "./pattern-paths.js";

const getSavedPattern = toJsonFileReader(PatternDetailSchema);

const listSavedPatterns = Effect.fn("PatternSaved.list")(function* run() {
  const folder = toPatternFolder();
  const names = yield* listFileNames(folder);

  const found = yield* Effect.all(
    names.flatMap((name) => {
      if (name.endsWith(JSON_SUFFIX)) {
        return [getSavedPattern(path.join(folder, name))];
      }

      return [];
    })
  );

  const patterns = found.flatMap((pattern): StoredPattern[] => {
    if (pattern === null) {
      return [];
    }

    return [pattern];
  });

  return patterns.toSorted((left, right) =>
    right.savedAt.localeCompare(left.savedAt)
  );
});

const getSavedPatternById = (id: string): Effect.Effect<StoredPattern | null> =>
  getSavedPattern(toPatternFile(id));

export { getSavedPatternById, listSavedPatterns };
