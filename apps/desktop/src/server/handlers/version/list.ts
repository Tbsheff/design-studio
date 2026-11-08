import type { Input } from "@design-studio/actions/_core/action";
import type { listVersion } from "@design-studio/actions/version/list";
import { Effect } from "effect";

import { VersionStore, toVersionPage } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListVersionInput = Input<typeof listVersion>;

const handle = Effect.fn("version.list")(function* run(
  input: ListVersionInput
) {
  const store = yield* VersionStore;

  const items = yield* store.list({
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return toVersionPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listVersion>;

export { handle };
