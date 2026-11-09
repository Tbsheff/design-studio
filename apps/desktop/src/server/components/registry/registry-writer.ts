import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type {
  ComponentImported,
  ImportComponentCommand,
} from "./registry-import.js";
import { runRegistryImportEffect } from "./registry-run.js";

interface RegistryWriterApi {
  readonly import: (
    command: ImportComponentCommand
  ) => Effect.Effect<ComponentImported, KnownFailure | Unavailable>;
}

class RegistryWriter extends Context.Service<
  RegistryWriter,
  RegistryWriterApi
>()("design-studio/components/RegistryWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    RegistryWriter,
    RegistryWriter.of({
      import: Effect.fn("RegistryWriter.import")(function* run(
        command: ImportComponentCommand
      ) {
        return yield* runRegistryImportEffect(command);
      }),
    })
  );
}

export { RegistryWriter };

export type { RegistryWriterApi };
