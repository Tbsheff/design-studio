import type { Input } from "@design-studio/actions/_core/action";
import type { setDevStatus } from "@design-studio/actions/dev-status/set";
import { Effect } from "effect";

import { DevStatusWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetDevStatusInput = Input<typeof setDevStatus>;

const handle = Effect.fn("dev-status.set")(function* run(
  input: SetDevStatusInput
) {
  const writer = yield* DevStatusWriter;

  return yield* writer.set({
    frameId: input.frameId,
    note: input.note,
    projectId: input.projectId,
    status: input.status,
  });
}) satisfies Handle<typeof setDevStatus>;

export { handle };
