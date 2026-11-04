import type { Input } from "@design-studio/actions/_core/action";
import type { listProp } from "@design-studio/actions/prop/list";
import { Effect } from "effect";

import { PropStore } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type ListPropInput = Input<typeof listProp>;

const handle = Effect.fn("prop.list")(function* run(input: ListPropInput) {
  const store = yield* PropStore;

  return yield* store.list({
    component: input.component,
    cursor: input.cursor,
    directionId: input.directionId,
    file: input.file,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listProp>;

export { handle };
