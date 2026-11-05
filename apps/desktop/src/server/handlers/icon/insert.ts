import type { Input } from "@design-studio/actions/_core/action";
import type { insertIcon } from "@design-studio/actions/icon/insert";
import { Effect } from "effect";

import { IconWriter } from "../../icons/index.js";
import type { Handle } from "../_core/handler.js";

type InsertIconInput = Input<typeof insertIcon>;

const handle = Effect.fn("icon.insert")(function* run(input: InsertIconInput) {
  const writer = yield* IconWriter;

  const { target } = input;

  return yield* writer.insert({
    color: input.color ?? null,
    directionId: input.directionId,
    library: input.library ?? null,
    name: input.name,
    position: input.position,
    projectId: input.projectId,
    size: input.size,
    target: {
      owners: target.owners ?? null,
      selector: target.selector ?? null,
      source: target.source,
      tag: target.tag ?? null,
    },
  });
}) satisfies Handle<typeof insertIcon>;

export { handle };
