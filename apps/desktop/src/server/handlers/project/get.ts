import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getProject } from "@design-studio/actions/project/get";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetProjectInput = Input<typeof getProject>;

const handle = Effect.fn("project.get")(function* run(input: GetProjectInput) {
  const store = yield* ProjectStore;

  return yield* store.get(input.projectId);
}) satisfies Handle<typeof getProject>;

export { handle };
