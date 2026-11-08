import type { Input } from "@design-studio/actions/_core/action";
import type { listShare } from "@design-studio/actions/share/list";
import { Effect } from "effect";

import { toPage } from "../../platform/page/index.js";
import { ShareStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListShareInput = Input<typeof listShare>;

const handle = Effect.fn("share.list")(function* run(input: ListShareInput) {
  const store = yield* ShareStore;

  const list = yield* store.list(input.projectId);

  return {
    ...toPage(list.links, input.cursor, input.limit),
    server: list.server,
  };
}) satisfies Handle<typeof listShare>;

export { handle };
