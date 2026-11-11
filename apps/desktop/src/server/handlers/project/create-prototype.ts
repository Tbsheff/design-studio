import type { Input } from "@design-studio/actions/_core/action";
import type { createPrototypeProject } from "@design-studio/actions/project/create-prototype";
import { Effect } from "effect";

import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePrototypeProjectInput = Input<typeof createPrototypeProject>;

const handle = Effect.fn("project.createPrototype")(function* run(
  input: CreatePrototypeProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.createPrototype(input);
}) satisfies Handle<typeof createPrototypeProject>;

export { handle };
