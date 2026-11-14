import type { Input } from "@design-studio/actions/_core/action";
import type { moveHiddenProject } from "@design-studio/actions/project/move-hidden";
import { Effect } from "effect";

import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type MoveHiddenProjectInput = Input<typeof moveHiddenProject>;

const handle = Effect.fn("project.moveHidden")(function* run(
  _input: MoveHiddenProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.moveHidden();
}) satisfies Handle<typeof moveHiddenProject>;

export { handle };
