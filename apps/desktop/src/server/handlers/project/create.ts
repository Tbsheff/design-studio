import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createProject } from "../../../shared/actions/project/create.js";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type CreateProjectInput = Input<typeof createProject>;

const handle = Effect.fn("project.create")(function* run(
  input: CreateProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.create(input);
}) satisfies Handle<typeof createProject>;

export { handle };
