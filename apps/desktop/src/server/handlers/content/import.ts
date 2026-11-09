import type { Input } from "@design-studio/actions/_core/action";
import type { importContent } from "@design-studio/actions/content/import";
import { Effect } from "effect";

import { ContentWriter } from "../../content/index.js";
import type { Handle } from "../_core/handler.js";

type ImportContentInput = Input<typeof importContent>;

const handle = Effect.fn("content.import")(function* run(
  input: ImportContentInput
) {
  const writer = yield* ContentWriter;

  return yield* writer.import({
    col: input.layer.col,
    columns: input.columns,
    directionId: input.directionId,
    file: input.layer.file,
    line: input.layer.line,
    projectId: input.projectId,
    text: input.text,
  });
}) satisfies Handle<typeof importContent>;

export { handle };
