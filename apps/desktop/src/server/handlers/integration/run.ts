import type { Input } from "@design-studio/actions/_core/action";
import type { runIntegration } from "@design-studio/actions/integration/run";
import { Effect } from "effect";

import { IntegrationWriter } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type RunIntegrationInput = Input<typeof runIntegration>;

const handle = Effect.fn("integration.run")(function* run(
  input: RunIntegrationInput
) {
  const writer = yield* IntegrationWriter;

  return yield* writer.run(input.integrationId);
}) satisfies Handle<typeof runIntegration>;

export { handle };
