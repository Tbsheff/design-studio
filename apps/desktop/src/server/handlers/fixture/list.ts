import type { Input } from "@design-studio/actions/_core/action";
import type { listFixture } from "@design-studio/actions/fixture/list";
import { Effect } from "effect";

import { FixtureStore } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type ListFixtureInput = Input<typeof listFixture>;

const handle = Effect.fn("fixture.list")(function* run(
  input: ListFixtureInput
) {
  const store = yield* FixtureStore;

  const page = yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    projectId: input.projectId,
  });

  const items = page.items.map((item) => ({
    createdAt: item.createdAt,
    file: item.file,
    frameId: item.frameId,
    id: item.id,
    route: item.route,
    sourceRoute: item.sourceRoute,
  }));

  return { items, next: page.next };
}) satisfies Handle<typeof listFixture>;

export { handle };
