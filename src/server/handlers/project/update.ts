import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateProject } from "../../../shared/actions/project/update.js";
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
