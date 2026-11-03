import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProject } from "../../../shared/actions/project/list.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListProjectsInput = Input<typeof listProject>;

const handle = Effect.fn("project.list")(function* run(
  _input: ListProjectsInput
) {
  const store = yield* ProjectStore;
  const items = yield* store.list();

  return { items };
}) satisfies Handle<typeof listProject>;

export { handle };
