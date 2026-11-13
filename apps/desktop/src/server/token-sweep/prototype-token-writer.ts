import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { importPrototypeTokens } from "./import-prototype-tokens.js";
import type {
  PrototypeTokenIds,
  TokenImportResult,
} from "./import-prototype-tokens.js";

interface PrototypeTokenWriterApi {
  readonly importTokens: (
    ids: PrototypeTokenIds
  ) => Effect.Effect<TokenImportResult, KnownFailure>;
}

class PrototypeTokenWriter extends Context.Service<
  PrototypeTokenWriter,
  PrototypeTokenWriterApi
>()("design-studio/token-sweep/PrototypeTokenWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PrototypeTokenWriter,
    PrototypeTokenWriter.of({
      importTokens: Effect.fn("PrototypeTokenWriter.importTokens")(
        function* run(ids: PrototypeTokenIds) {
          return yield* importPrototypeTokens(ids);
        }
      ),
    })
  );
}

export { PrototypeTokenWriter };

export type { PrototypeTokenWriterApi, TokenImportResult };
