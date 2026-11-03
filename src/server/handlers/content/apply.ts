import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyContent } from "../../../shared/actions/content/apply.js";
import { ContentWriter } from "../../content/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyContentInput = Input<typeof applyContent>;

const handle = Effect.fn("content.apply")(function* run(
  input: ApplyContentInput
) {
  const writer = yield* ContentWriter;

  return yield* writer.apply({
    col: input.layer.col,
    directionId: input.directionId,
    file: input.layer.file,
    line: input.layer.line,
    mode: input.mode,
    preset: input.preset,
    projectId: input.projectId,
    repeat: input.repeat,
    seed: input.seed,
  });
}) satisfies Handle<typeof applyContent>;

export { handle };
