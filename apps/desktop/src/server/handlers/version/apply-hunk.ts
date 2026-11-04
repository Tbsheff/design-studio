import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { applyHunkVersion } from "@design-studio/actions/version/apply-hunk";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyHunkVersionInput = Input<typeof applyHunkVersion>;

const handle = Effect.fn("version.applyHunk")(function* run(
  input: ApplyHunkVersionInput
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
}) satisfies Handle<typeof applyHunkVersion>;

export { handle };
