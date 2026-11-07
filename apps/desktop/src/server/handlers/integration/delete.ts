import type { Input } from "@design-studio/actions/_core/action";
import type { deleteIntegration } from "@design-studio/actions/integration/delete";
import { Effect } from "effect";

import {
  IntegrationStore,
  IntegrationWriter,
} from "../../direct-edit/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteIntegrationInput = Input<typeof deleteIntegration>;

const handle = Effect.fn("integration.delete")(function* run(
  input: DeleteIntegrationInput
) {
  const writer = yield* IntegrationWriter;

  return yield* writer.delete(input.integrationId);
}) satisfies Handle<typeof deleteIntegration>;

const preview = Effect.fn("integration.delete.preview")(function* card(
  input: DeleteIntegrationInput
) {
  const store = yield* IntegrationStore;
  const saved = yield* store.get(input.integrationId);

  return {
    action: "Delete an integration",
    detail: `Removes the saved ${saved.transport} integration ${saved.name} and its secret from the studio. In-app chat can no longer call its tools.`,
    title: `Delete the integration ${saved.name}`,
  };
}) satisfies Preview<typeof deleteIntegration>;

export { handle, preview };
