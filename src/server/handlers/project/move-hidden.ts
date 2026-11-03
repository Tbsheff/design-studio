import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { moveHiddenProject } from "../../../shared/actions/project/move-hidden.js";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type MoveHiddenProjectsInput = Input<typeof moveHiddenProject>;

const handle = Effect.fn("project.moveHidden")(function* run(
  _input: MoveHiddenProjectsInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.moveHidden();
}) satisfies Handle<typeof moveHiddenProject>;

export { handle };
