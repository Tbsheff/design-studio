import type { Input } from "@design-studio/actions/_core/action";
import type { setFill } from "@design-studio/actions/fill/set";
import { Effect } from "effect";

import { FillWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetFillInput = Input<typeof setFill>;

const handle = Effect.fn("fill.set")(function* run(input: SetFillInput) {
  const writer = yield* FillWriter;
  const { target } = input;

  return yield* writer.set({
    directionId: input.directionId,
    fill: input.fill,
    projectId: input.projectId,
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setFill>;

export { handle };
