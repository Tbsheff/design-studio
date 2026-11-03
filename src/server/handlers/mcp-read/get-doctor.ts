import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDoctorMcpRead } from "../../../shared/actions/mcp-read/get-doctor.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetDoctorMcpReadInput = Input<typeof getDoctorMcpRead>;

const handle = Effect.fn("mcp-read.getDoctor")(function* run(
  input: GetDoctorMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.doctor(input.projectId, input.fresh === true);
}) satisfies Handle<typeof getDoctorMcpRead>;

export { handle };
