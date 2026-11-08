import type { Input } from "@design-studio/actions/_core/action";
import type { exportVersion } from "@design-studio/actions/version/export";
import { Effect } from "effect";

import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ExportVersionInput = Input<typeof exportVersion>;

const handle = Effect.fn("version.export")(function* run(
  input: ExportVersionInput
) {
  const service = yield* VersionStore;

  return yield* service.export(input.projectId, input.versionId);
}) satisfies Handle<typeof exportVersion>;

export { handle };
