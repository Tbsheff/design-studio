import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { importProject } from "../../../shared/actions/project/import.js";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ImportProjectInput = Input<typeof importProject>;

const handle = Effect.fn("project.import")(function* run(
  input: ImportProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.importFolder(input);
}) satisfies Handle<typeof importProject>;

export { handle };
