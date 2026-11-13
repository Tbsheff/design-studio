import type { Input } from "@design-studio/actions/_core/action";
import type { setSourcePage } from "@design-studio/actions/page/set-source";
import { Effect } from "effect";

import { RouteSourceWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetSourcePageInput = Input<typeof setSourcePage>;

const handle = Effect.fn("page.setSource")(function* run(
  input: SetSourcePageInput
) {
  const writer = yield* RouteSourceWriter;

  const entry = yield* writer.set({
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
  });

  return {
    fileCount: entry.files.length,
    hasSnapshot: entry.hasSnapshot,
    page: entry.page,
    routePath: entry.routePath,
  };
}) satisfies Handle<typeof setSourcePage>;

export { handle };
