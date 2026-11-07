import type { Input } from "@design-studio/actions/_core/action";
import type { insertPattern } from "@design-studio/actions/pattern/insert";
import { Effect } from "effect";

import { PatternWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InsertPatternInput = Input<typeof insertPattern>;

const handle = Effect.fn("pattern.insert")(function* run(
  input: InsertPatternInput
) {
  const writer = yield* PatternWriter;

  return yield* writer.insert({
    directionId: input.directionId,
    page: input.page,
    patternId: input.patternId,
    position: input.position,
    projectId: input.projectId,
    source: input.target?.source ?? null,
    tag: input.target?.tag ?? null,
  });
}) satisfies Handle<typeof insertPattern>;

export { handle };
