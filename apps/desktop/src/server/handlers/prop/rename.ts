import type { Input } from "@design-studio/actions/_core/action";
import type { renameProp } from "@design-studio/actions/prop/rename";
import { Effect } from "effect";

import { PropWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type RenamePropInput = Input<typeof renameProp>;

const handle = Effect.fn("prop.rename")(function* run(input: RenamePropInput) {
  const writer = yield* PropWriter;

  return yield* writer.rename({
    component: input.component,
    directionId: input.directionId,
    file: input.file,
    name: input.name,
    newName: input.newName,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof renameProp>;

export { handle };
