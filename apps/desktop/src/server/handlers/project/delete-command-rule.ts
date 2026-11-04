import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deleteCommandRuleProject } from "@design-studio/actions/project/delete-command-rule";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteCommandRuleProjectInput = Input<typeof deleteCommandRuleProject>;

const RULE_TEXT_MAX = 120;

const handle = Effect.fn("project.deleteCommandRule")(function* run(
  input: DeleteCommandRuleProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.deleteCommandRule(input.projectId, input.rule);
}) satisfies Handle<typeof deleteCommandRuleProject>;

const preview = Effect.fn("project.deleteCommandRule.preview")(function* card(
  input: DeleteCommandRuleProjectInput
) {
  return yield* Effect.succeed({
    action: "Delete a command rule",
    detail:
      "The studio agent asks again before it runs this shell command in this project.",
    title: `Delete the command rule “${input.rule.slice(0, RULE_TEXT_MAX)}”`,
  });
}) satisfies Preview<typeof deleteCommandRuleProject>;

export { handle, preview };
