import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getHiddenProject } from "../../../shared/actions/project/get-hidden.js";
import { ProjectOpsStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type GetHiddenProjectInput = Input<typeof getHiddenProject>;

const handle = Effect.fn("project.getHidden")(function* run(
  _input: GetHiddenProjectInput
) {
  const store = yield* ProjectOpsStore;

  return yield* store.countHidden();
}) satisfies Handle<typeof getHiddenProject>;

export { handle };
