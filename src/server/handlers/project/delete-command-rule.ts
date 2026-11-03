import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteCommandRuleProject } from "../../../shared/actions/project/delete-command-rule.js";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteCommandRuleProjectsInput = Input<typeof deleteCommandRuleProject>;

const handle = Effect.fn("project.deleteCommandRule")(function* run(
  input: DeleteCommandRuleProjectsInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.deleteCommandRule(input.projectId, input.rule);
}) satisfies Handle<typeof deleteCommandRuleProject>;

export { handle };
