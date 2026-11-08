import path from "node:path";

import {
  CAP_DEFAULT_USD,
  CompletionFileSchema,
} from "@design-studio/actions/completion/schema";
import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import { toJsonFileReader } from "../../platform/local-file/index.js";
import { viewportRuntime } from "../../viewport/index.js";

type CompletionFile = typeof CompletionFileSchema.Type;

type CompletionRecord = CompletionFile["records"][number];

type CompletionSettings = CompletionFile["settings"];

const RECORD_KEEP = 1000;

const EMPTY_FILE: CompletionFile = {
  records: [],
  settings: { capUsd: CAP_DEFAULT_USD, isEnabled: false },
};

const readCompletionFile = toJsonFileReader(CompletionFileSchema);

const toCompletionPath = (projectDir: string): string =>
  path.join(projectDir, "completion.json");

const getSavedCompletion = Effect.fn("CompletionFile.get")(function* run(
  projectId: string
) {
  const runtime = yield* viewportRuntime;

  const found = yield* readCompletionFile(
    toCompletionPath(runtime.projectDir(projectId))
  );

  return found ?? EMPTY_FILE;
});

const setSavedCompletion = Effect.fn("CompletionFile.set")(function* run(
  projectId: string,
  file: CompletionFile
) {
  const runtime = yield* viewportRuntime;

  yield* setPrivateJson(toCompletionPath(runtime.projectDir(projectId)), {
    ...file,
    records: file.records.slice(-RECORD_KEEP),
  });
});

export { getSavedCompletion, setSavedCompletion };

export type { CompletionFile, CompletionRecord, CompletionSettings };
