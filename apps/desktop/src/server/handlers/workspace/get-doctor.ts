import type { Input } from "@design-studio/actions/_core/action";
import type { getDoctorWorkspace } from "@design-studio/actions/workspace/get-doctor";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetDoctorWorkspaceInput = Input<typeof getDoctorWorkspace>;

const handle = Effect.fn("workspace.getDoctor")(function* run(
  input: GetDoctorWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.doctor(input.projectId, input.fresh === true);
}) satisfies Handle<typeof getDoctorWorkspace>;

export { handle };
