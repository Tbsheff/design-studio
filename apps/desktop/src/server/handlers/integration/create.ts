import type { Input } from "@design-studio/actions/_core/action";
import type { createIntegration } from "@design-studio/actions/integration/create";
import { Effect } from "effect";

import { IntegrationWriter } from "../../publish/index.js";
import type { Handle } from "../_core/handler.js";

type CreateIntegrationInput = Input<typeof createIntegration>;

const handle = Effect.fn("integration.create")(function* run(
  input: CreateIntegrationInput
) {
  const writer = yield* IntegrationWriter;

  return yield* writer.create({
    args: input.args,
    command: input.command,
    name: input.name,
    secret: input.secret,
    secretName: input.secretName,
    transport: input.transport,
    url: input.url,
  });
}) satisfies Handle<typeof createIntegration>;

export { handle };
