import type { Input } from "@design-studio/actions/_core/action";
import type { getFileProject } from "@design-studio/actions/project/get-file";
import { Effect } from "effect";

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
