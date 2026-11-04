import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updateProject } from "@design-studio/actions/project/update";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateProjectInput = Input<typeof updateProject>;

const handle = Effect.fn("project.update")(function* run(
  input: UpdateProjectInput
) {
  const writer = yield* ProjectOpsWriter;
  const { projectId, ...fields } = input;

  return yield* writer.updateSettings(projectId, fields);
}) satisfies Handle<typeof updateProject>;

export { handle };
