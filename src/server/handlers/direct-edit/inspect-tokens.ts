import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectTokensDirectEdit } from "../../../shared/actions/direct-edit/inspect-tokens.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InspectTokensDirectEditInput = Input<typeof inspectTokensDirectEdit>;

const handle = Effect.fn("direct-edit.inspectTokens")(function* run(
  input: InspectTokensDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.previewTokens(toRef(input), { changes: input.changes });
}) satisfies Handle<typeof inspectTokensDirectEdit>;

export { handle };
