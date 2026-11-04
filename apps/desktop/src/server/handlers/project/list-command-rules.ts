import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listCommandRulesProject } from "../../../shared/actions/project/list-command-rules.js";
import { toPage } from "../../platform/page/index.js";
import { ProjectOpsStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommandRulesProjectInput = Input<typeof listCommandRulesProject>;

const handle = Effect.fn("project.listCommandRules")(function* run(
  input: ListCommandRulesProjectInput
) {
  const store = yield* ProjectOpsStore;
  const { rules } = yield* store.listCommandRules(input.projectId);

  return toPage(rules, input.cursor, input.limit);
}) satisfies Handle<typeof listCommandRulesProject>;

export { handle };
