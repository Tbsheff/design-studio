import path from "node:path";

import { IntegrationSchema } from "@design-studio/actions/integration/schema";
import { Effect } from "effect";

import { listFileNames, toJsonFileReader } from "./deps.js";
import type { StoredIntegration } from "./integration-model.js";
import {
  JSON_SUFFIX,
  toIntegrationFile,
  toIntegrationFolder,
} from "./integration-paths.js";

const getSavedIntegration = toJsonFileReader(IntegrationSchema);

const listSavedIntegrations = Effect.fn("IntegrationSaved.list")(
  function* run() {
    const folder = toIntegrationFolder();
    const names = yield* listFileNames(folder);

    const found = yield* Effect.all(
      names.flatMap((name) => {
        if (name.endsWith(JSON_SUFFIX)) {
          return [getSavedIntegration(path.join(folder, name))];
        }

        return [];
      })
    );

    const saved = found.flatMap((item): StoredIntegration[] => {
      if (item === null) {
        return [];
      }

      return [item];
    });

    return saved.toSorted((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }
);

const getSavedIntegrationById = (
  id: string
): Effect.Effect<StoredIntegration | null> =>
  getSavedIntegration(toIntegrationFile(id));

export { getSavedIntegrationById, listSavedIntegrations };
