import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getFileProject } from "../../../shared/actions/project/get-file.js";
import { ProjectOpsStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type GetFileProjectInput = Input<typeof getFileProject>;

const handle = Effect.fn("project.getFile")(function* run(
  input: GetFileProjectInput
) {
  const store = yield* ProjectOpsStore;

  return yield* store.readFile(input.projectId, input.path);
}) satisfies Handle<typeof getFileProject>;

export { handle };
