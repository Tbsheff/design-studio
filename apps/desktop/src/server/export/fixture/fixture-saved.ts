import path from "node:path";

import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import { loadConfig } from "../../platform/config/index.js";
import { toJsonFileReader } from "../../platform/local-file/index.js";
import { FixtureRegistrySchema } from "./fixture-model.js";
import type { StoredFixture } from "./fixture-model.js";

const readRegistry = toJsonFileReader(FixtureRegistrySchema);

const toRegistryPath = (projectId: string): string =>
  path.join(loadConfig().dataDir, "fixtures", `${projectId}.json`);

const listSavedFixtures = Effect.fn("listSavedFixtures")(function* run(
  projectId: string
) {
  const registry = yield* readRegistry(toRegistryPath(projectId));

  return registry?.fixtures ?? [];
});

const setSavedFixtures = Effect.fn("setSavedFixtures")(function* run(
  projectId: string,
  fixtures: readonly StoredFixture[]
) {
  yield* setPrivateJson(toRegistryPath(projectId), { fixtures });
});

export { listSavedFixtures, setSavedFixtures };
