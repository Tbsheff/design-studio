import type { Input } from "@design-studio/actions/_core/action";
import type { createDesignRule } from "@design-studio/actions/design-rule/create";
import { Effect } from "effect";

import { DesignRuleWriter } from "../../design-rules/index.js";
import { DesignRuleLineRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type CreateDesignRuleInput = Input<typeof createDesignRule>;

const handle = Effect.fn("design-rule.create")(function* run(
  input: CreateDesignRuleInput
) {
  const runner = yield* DesignRuleLineRunner;
  const writer = yield* DesignRuleWriter;
  const drafted = yield* runner.draft(input.text);

  return yield* writer.create({
    directionId: input.directionId,
    line: drafted.line,
    model: drafted.model,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createDesignRule>;

export { handle };
