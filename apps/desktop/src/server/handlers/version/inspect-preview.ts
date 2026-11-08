import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPreviewVersion } from "@design-studio/actions/version/inspect-preview";
import { Effect } from "effect";

import { VersionStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPreviewVersionInput = Input<typeof inspectPreviewVersion>;

const handle = Effect.fn("version.inspectPreview")(function* run(
  input: InspectPreviewVersionInput
) {
  const service = yield* VersionStore;

  return yield* service.preview(input.projectId, input.versionId);
}) satisfies Handle<typeof inspectPreviewVersion>;

export { handle };
