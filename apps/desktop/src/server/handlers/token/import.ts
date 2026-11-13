import type { Input } from "@design-studio/actions/_core/action";
import type { importToken } from "@design-studio/actions/token/import";
import { Effect } from "effect";

import { PrototypeTokenWriter } from "../../token-sweep/index.js";
import type { Handle } from "../_core/handler.js";

type ImportTokenInput = Input<typeof importToken>;

const handle = Effect.fn("token.import")(function* run(
  input: ImportTokenInput
) {
  const writer = yield* PrototypeTokenWriter;

  return yield* writer.importTokens({
    directionId: input.directionId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof importToken>;

export { handle };
