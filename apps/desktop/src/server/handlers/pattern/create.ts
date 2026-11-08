import type { Input } from "@design-studio/actions/_core/action";
import type { createPattern } from "@design-studio/actions/pattern/create";
import { Effect } from "effect";

import { PatternWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type CreatePatternInput = Input<typeof createPattern>;

const handle = Effect.fn("pattern.create")(function* run(
  input: CreatePatternInput
) {
  const writer = yield* PatternWriter;

  return yield* writer.create({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
    source: input.target.source,
    tag: input.target.tag ?? null,
    tags: input.tags,
    thumbnail: input.thumbnail,
  });
}) satisfies Handle<typeof createPattern>;

export { handle };
