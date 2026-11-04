import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { runDirectEdit } from "@design-studio/actions/direct-edit/run";
import { DirectEditWriter, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type RunDirectEditInput = Input<typeof runDirectEdit>;

const handle = Effect.fn("direct-edit.run")(function* run(
  input: RunDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.check(toRef(input));
}) satisfies Handle<typeof runDirectEdit>;

export { handle };
