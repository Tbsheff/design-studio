import type { Input } from "@design-studio/actions/_core/action";
import type { insertBlock } from "@design-studio/actions/block/insert";
import { Effect } from "effect";

import { BlockWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type InsertBlockInput = Input<typeof insertBlock>;

const handle = Effect.fn("block.insert")(function* run(
  input: InsertBlockInput
) {
  const writer = yield* BlockWriter;

  return yield* writer.insert({
    blockId: input.blockId,
    directionId: input.directionId,
    position: input.position,
    projectId: input.projectId,
    targetSelector: input.targetSelector,
    targetSource: input.targetSource,
  });
}) satisfies Handle<typeof insertBlock>;

export { handle };
