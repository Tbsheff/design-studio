import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProject } from "../../../shared/actions/project/list.js";
import { toPage } from "../../platform/page/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListProjectInput = Input<typeof listProject>;

const handle = Effect.fn("project.list")(function* run(
  input: ListProjectInput
) {
  const store = yield* ProjectStore;
  const items = yield* store.list();

  return toPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listProject>;

export { handle };
