import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getProject } from "../../../shared/actions/project/get.js";
import { LocalOrgScope, ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetProjectInput = Input<typeof getProject>;

const handle = Effect.fn("project.get")(function* run(input: GetProjectInput) {
  const store = yield* ProjectStore;
  const scope = yield* LocalOrgScope;

  return yield* store.get(input.projectId, scope);
}) satisfies Handle<typeof getProject>;

export { handle };
