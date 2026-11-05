import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runComponentVariantWrite } from "./component-variant-run.js";
import type {
  ComponentVariantWritten,
  WriteComponentVariantCommand,
} from "./component-variant-run.js";

interface ComponentVariantWriterApi {
  readonly write: (
    command: WriteComponentVariantCommand
  ) => Effect.Effect<ComponentVariantWritten, KnownFailure>;
}

class ComponentVariantWriter extends Context.Service<
  ComponentVariantWriter,
  ComponentVariantWriterApi
>()("design-studio/components/ComponentVariantWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ComponentVariantWriter,
    ComponentVariantWriter.of({
      write: Effect.fn("ComponentVariantWriter.write")(function* run(
        command: WriteComponentVariantCommand
      ) {
        return yield* runComponentVariantWrite(command);
      }),
    })
  );
}

export { ComponentVariantWriter };

export type { ComponentVariantWriterApi };
