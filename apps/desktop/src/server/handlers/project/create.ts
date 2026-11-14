import type { Input } from "@design-studio/actions/_core/action";
import type { createProject } from "@design-studio/actions/project/create";
import { Effect } from "effect";

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
