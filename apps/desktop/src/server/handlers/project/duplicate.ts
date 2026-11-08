import type { Input } from "@design-studio/actions/_core/action";
import type { duplicateProject } from "@design-studio/actions/project/duplicate";
import { Effect } from "effect";

import { ProjectLibraryWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type DuplicateProjectInput = Input<typeof duplicateProject>;

const handle = Effect.fn("project.duplicate")(function* run(
  input: DuplicateProjectInput
) {
  const writer = yield* ProjectLibraryWriter;
  const project = yield* writer.duplicate(input.projectId);

  return { project };
}) satisfies Handle<typeof duplicateProject>;

export { handle };
