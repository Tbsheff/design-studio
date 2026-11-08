import type { Input } from "@design-studio/actions/_core/action";
import type { inspectTokensDirectEdit } from "@design-studio/actions/direct-edit/inspect-tokens";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type InspectTokensDirectEditInput = Input<typeof inspectTokensDirectEdit>;

const handle = Effect.fn("direct-edit.inspectTokens")(function* run(
  input: InspectTokensDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.previewTokens(toRef(input), { changes: input.changes });
}) satisfies Handle<typeof inspectTokensDirectEdit>;

export { handle };
