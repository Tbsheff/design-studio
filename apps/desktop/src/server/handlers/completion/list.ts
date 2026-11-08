import type { Input } from "@design-studio/actions/_core/action";
import type { listCompletion } from "@design-studio/actions/completion/list";
import { Effect } from "effect";

import { CompletionStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListCompletionInput = Input<typeof listCompletion>;

const handle = Effect.fn("completion.list")(function* run(
  input: ListCompletionInput
) {
  const store = yield* CompletionStore;

  return yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listCompletion>;

export { handle };
