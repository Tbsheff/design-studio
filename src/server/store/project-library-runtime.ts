import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";
import type { ProjectLibrary } from "./project-library.js";

const slot = makeRuntimeSlot<ProjectLibrary>("Project library");

const bindProjectLibraryRuntime = (
  dataDir: string,
  library: ProjectLibrary
): void => {
  slot.bindAt(dataDir, library);
};

const readProjectLibraryRuntime = slot.read;

const attemptLibrary = <Value>(
  task: (library: ProjectLibrary) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withLibrary() {
    const library = yield* slot.read;

    return yield* attemptKnown(() => task(library));
  });

export { attemptLibrary, bindProjectLibraryRuntime, readProjectLibraryRuntime };
