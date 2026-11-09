import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Context, Effect, Layer } from "effect";

import { runDesignRuleLine } from "./design-rule-line-run.js";
import type { DesignRuleLine } from "./design-rule-line-run.js";

interface DesignRuleLineRunnerApi {
  readonly draft: (text: string) => Effect.Effect<DesignRuleLine, BadRequest>;
}

class DesignRuleLineRunner extends Context.Service<
  DesignRuleLineRunner,
  DesignRuleLineRunnerApi
>()("design-studio/project-ops/DesignRuleLineRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    DesignRuleLineRunner,
    DesignRuleLineRunner.of({
      draft: Effect.fn("DesignRuleLineRunner.draft")(function* run(
        text: string
      ) {
        return yield* runDesignRuleLine(text);
      }),
    })
  );
}

export { DesignRuleLineRunner };

export type { DesignRuleLineRunnerApi };
