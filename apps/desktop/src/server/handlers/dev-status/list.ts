import type { Input } from "@design-studio/actions/_core/action";
import type { listDevStatus } from "@design-studio/actions/dev-status/list";
import { Effect } from "effect";

import { DevStatusStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListDevStatusInput = Input<typeof listDevStatus>;

const handle = Effect.fn("dev-status.list")(function* run(
  input: ListDevStatusInput
) {
  const store = yield* DevStatusStore;

  return yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    projectId: input.projectId,
    status: input.status,
  });
}) satisfies Handle<typeof listDevStatus>;

export { handle };
