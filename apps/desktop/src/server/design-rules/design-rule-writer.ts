import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runDesignRuleCreate } from "./design-rule-run.js";
import type {
  CreateDesignRuleCommand,
  DesignRuleCreated,
} from "./design-rule-run.js";

interface DesignRuleWriterApi {
  readonly create: (
    command: CreateDesignRuleCommand
  ) => Effect.Effect<DesignRuleCreated, KnownFailure>;
}

class DesignRuleWriter extends Context.Service<
  DesignRuleWriter,
  DesignRuleWriterApi
>()("design-studio/design-rules/DesignRuleWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    DesignRuleWriter,
    DesignRuleWriter.of({
      create: Effect.fn("DesignRuleWriter.create")(function* run(
        command: CreateDesignRuleCommand
      ) {
        return yield* runDesignRuleCreate(command);
      }),
    })
  );
}

export { DesignRuleWriter };

export type { DesignRuleWriterApi };
