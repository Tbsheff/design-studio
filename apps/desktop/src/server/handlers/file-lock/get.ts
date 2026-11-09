import type { Input } from "@design-studio/actions/_core/action";
import type { getFileLock } from "@design-studio/actions/file-lock/get";
import { Effect } from "effect";

import { toPage } from "../../platform/page/index.js";
import { FileLockStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetFileLockInput = Input<typeof getFileLock>;

const handle = Effect.fn("file-lock.get")(function* run(
  input: GetFileLockInput
) {
  const store = yield* FileLockStore;
  const globs = yield* store.get(input.projectId, input.directionId);
  const page = toPage(globs, input.cursor, input.limit);

  return { directionId: input.directionId, items: page.items, next: page.next };
}) satisfies Handle<typeof getFileLock>;

export { handle };
