import path from "node:path";

import { DevNoteFileSchema } from "@design-studio/actions/dev-note/schema";
import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import { toJsonFileReader } from "../../platform/local-file/index.js";
import { viewportRuntime } from "../../viewport/index.js";

type DevNoteFile = typeof DevNoteFileSchema.Type;

type DevNoteRecord = DevNoteFile["notes"][number];

const EMPTY_FILE: DevNoteFile = { nextNumber: 1, notes: [] };

const readDevNoteFile = toJsonFileReader(DevNoteFileSchema);

const toNotesPath = (projectDir: string): string =>
  path.join(projectDir, "checks", "dev-notes.json");

const getSavedDevNotes = Effect.fn("DevNoteFile.get")(function* run(
  projectId: string
) {
  const runtime = yield* viewportRuntime;

  const found = yield* readDevNoteFile(
    toNotesPath(runtime.projectDir(projectId))
  );

  return found ?? EMPTY_FILE;
});

const setSavedDevNotes = Effect.fn("DevNoteFile.set")(function* run(
  projectId: string,
  file: DevNoteFile
) {
  const runtime = yield* viewportRuntime;

  yield* setPrivateJson(toNotesPath(runtime.projectDir(projectId)), file);
});

export { getSavedDevNotes, setSavedDevNotes };

export type { DevNoteFile, DevNoteRecord };
