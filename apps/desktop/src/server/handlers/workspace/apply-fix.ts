import type { Input } from "@design-studio/actions/_core/action";
import type { applyFixWorkspace } from "@design-studio/actions/workspace/apply-fix";
import { Effect } from "effect";

import { AppFixRunner } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyFixWorkspaceInput = Input<typeof applyFixWorkspace>;

const handle = Effect.fn("workspace.applyFix")(function* run(
  input: ApplyFixWorkspaceInput
) {
  const runner = yield* AppFixRunner;

  return yield* runner.apply(input.projectId, input.kind);
}) satisfies Handle<typeof applyFixWorkspace>;

export { handle };
