import type { Input } from "@design-studio/actions/_core/action";
import type { deleteProject } from "@design-studio/actions/project/delete";
import { Effect } from "effect";

import { ProjectLibraryWriter, ProjectStore } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteProjectInput = Input<typeof deleteProject>;

const handle = Effect.fn("project.delete")(function* run(
  input: DeleteProjectInput
) {
  const writer = yield* ProjectLibraryWriter;

  return yield* writer.trash(input.projectId);
}) satisfies Handle<typeof deleteProject>;

const preview = Effect.fn("project.delete.preview")(function* card(
  input: DeleteProjectInput
) {
  const store = yield* ProjectStore;
  const project = yield* store.get(input.projectId);

  return {
    action: "Move a project to Trash",
    detail: "The project moves to Trash. You can restore it from Trash.",
    title: `Move ${project.name} to Trash`,
  };
}) satisfies Preview<typeof deleteProject>;

export { handle, preview };
