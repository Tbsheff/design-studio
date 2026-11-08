import type { Input } from "@design-studio/actions/_core/action";
import type { listIntegration } from "@design-studio/actions/integration/list";
import { Effect } from "effect";

import { IntegrationStore } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type ListIntegrationInput = Input<typeof listIntegration>;

const handle = Effect.fn("integration.list")(function* run(
  input: ListIntegrationInput
) {
  const store = yield* IntegrationStore;

  return yield* store.list({ cursor: input.cursor, limit: input.limit });
}) satisfies Handle<typeof listIntegration>;

export { handle };
