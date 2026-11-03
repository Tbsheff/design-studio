import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listCommandRulesProject } from "../../../shared/actions/project/list-command-rules.js";
import { ProjectOpsStore } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ListCommandRulesProjectsInput = Input<typeof listCommandRulesProject>;

const handle = Effect.fn("project.listCommandRules")(function* run(
  input: ListCommandRulesProjectsInput
) {
  const store = yield* ProjectOpsStore;

  return yield* store.listCommandRules(input.projectId);
}) satisfies Handle<typeof listCommandRulesProject>;

export { handle };
