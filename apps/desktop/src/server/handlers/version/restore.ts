import type { Input } from "@design-studio/actions/_core/action";
import type { restoreVersion } from "@design-studio/actions/version/restore";
import { Effect } from "effect";

import { VersionWriter } from "../../store/index.js";
import type { Handle, Preview } from "../_core/handler.js";

const SHORT_ID = 8;

type RestoreVersionInput = Input<typeof restoreVersion>;

const handle = Effect.fn("version.restore")(function* run(
  input: RestoreVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.restore({
    directionId: input.directionId,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof restoreVersion>;

const preview = Effect.fn("version.restore.preview")(function* card(
  input: RestoreVersionInput
) {
  yield* Effect.void;

  return {
    action: "Restore version",
    detail: `Make version ${input.versionId.slice(0, SHORT_ID)} the current design of direction ${input.directionId}. Undo takes it back.`,
    title: "Restore this version?",
  };
}) satisfies Preview<typeof restoreVersion>;

export { handle, preview };
