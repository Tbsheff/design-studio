import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyHunkVersions } from "../../../shared/actions/versions/apply-hunk.js";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyHunkVersionsInput = Input<typeof applyHunkVersions>;

const handle = Effect.fn("versions.applyHunk")(function* run(
  input: ApplyHunkVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.revertHunk({
    directionId: input.directionId,
    file: input.file,
    from: input.from ?? null,
    hunk: input.hunk,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof applyHunkVersions>;

export { handle };
