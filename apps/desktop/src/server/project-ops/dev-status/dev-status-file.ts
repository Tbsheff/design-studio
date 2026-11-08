import path from "node:path";

import { DevStatusFileSchema } from "@design-studio/actions/dev-status/schema";
import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import { toJsonFileReader } from "../../platform/local-file/index.js";
import { viewportRuntime } from "../../viewport/index.js";

type DevStatusFile = typeof DevStatusFileSchema.Type;

type DevStatusRecord = DevStatusFile["entries"][number];

const EMPTY_FILE: DevStatusFile = { entries: [] };

const readDevStatusFile = toJsonFileReader(DevStatusFileSchema);

const toStatusPath = (projectDir: string): string =>
  path.join(projectDir, "checks", "dev-status.json");

const getSavedDevStatus = Effect.fn("DevStatusFile.get")(function* run(
  projectId: string
) {
  const runtime = yield* viewportRuntime;

  const found = yield* readDevStatusFile(
    toStatusPath(runtime.projectDir(projectId))
  );

  return found ?? EMPTY_FILE;
});

const setSavedDevStatus = Effect.fn("DevStatusFile.set")(function* run(
  projectId: string,
  file: DevStatusFile
) {
  const runtime = yield* viewportRuntime;

  yield* setPrivateJson(toStatusPath(runtime.projectDir(projectId)), file);
});

export { getSavedDevStatus, setSavedDevStatus };

export type { DevStatusFile, DevStatusRecord };
