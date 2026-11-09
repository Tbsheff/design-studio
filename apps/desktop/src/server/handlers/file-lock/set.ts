import type { Input } from "@design-studio/actions/_core/action";
import type { setFileLock } from "@design-studio/actions/file-lock/set";
import { Effect } from "effect";

import { FileLockWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type SetFileLockInput = Input<typeof setFileLock>;

const handle = Effect.fn("file-lock.set")(function* run(
  input: SetFileLockInput
) {
  const writer = yield* FileLockWriter;

  const globs = yield* writer.set(
    input.projectId,
    input.directionId,
    input.globs
  );

  return { directionId: input.directionId, globs };
}) satisfies Handle<typeof setFileLock>;

export { handle };
