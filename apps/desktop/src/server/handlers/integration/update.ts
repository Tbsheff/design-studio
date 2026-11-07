import type { Input } from "@design-studio/actions/_core/action";
import type { updateIntegration } from "@design-studio/actions/integration/update";
import { Effect } from "effect";

import { IntegrationWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateIntegrationInput = Input<typeof updateIntegration>;

const handle = Effect.fn("integration.update")(function* run(
  input: UpdateIntegrationInput
) {
  const writer = yield* IntegrationWriter;

  return yield* writer.update({
    allowedTools: input.allowedTools,
    args: input.args,
    command: input.command,
    id: input.integrationId,
    isEnabled: input.isEnabled,
    secret: input.secret,
    secretName: input.secretName,
    url: input.url,
  });
}) satisfies Handle<typeof updateIntegration>;

export { handle };
