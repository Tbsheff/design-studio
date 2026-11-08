import type { Input } from "@design-studio/actions/_core/action";
import type { importReference } from "@design-studio/actions/reference/import";
import { Effect } from "effect";

import { ReferenceWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ImportReferenceInput = Input<typeof importReference>;

const handle = Effect.fn("reference.import")(function* run(
  input: ImportReferenceInput
) {
  const writer = yield* ReferenceWriter;

  return yield* writer.import({
    data: input.data,
    fileName: input.fileName,
    name: input.name,
    path: input.path,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof importReference>;

export { handle };
