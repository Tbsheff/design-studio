import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDoctorWorkspace } from "../../../shared/actions/workspace/get-doctor.js";
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
