import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listHiddenProject } from "../../../shared/actions/project/list-hidden.js";
import { ProjectOpsStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListHiddenProjectsInput = Input<typeof listHiddenProject>;

const handle = Effect.fn("project.listHidden")(function* run(
  _input: ListHiddenProjectsInput
) {
  const store = yield* ProjectOpsStore;

  return yield* store.countHidden();
}) satisfies Handle<typeof listHiddenProject>;

export { handle };
