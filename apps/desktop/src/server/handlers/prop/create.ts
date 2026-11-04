import type { Input } from "@design-studio/actions/_core/action";
import type { createProp } from "@design-studio/actions/prop/create";
import { Effect } from "effect";

import { PropWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePropInput = Input<typeof createProp>;

const handle = Effect.fn("prop.create")(function* run(input: CreatePropInput) {
  const writer = yield* PropWriter;

  return yield* writer.create({
    component: input.component,
    directionId: input.directionId,
    file: input.file,
    kind: input.kind,
    layerCol: input.layerCol,
    layerLine: input.layerLine,
    name: input.name,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createProp>;

export { handle };
