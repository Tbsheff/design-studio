import type { Input } from "@design-studio/actions/_core/action";
import type { listFixture } from "@design-studio/actions/fixture/list";
import { Effect } from "effect";

import { FixtureStore } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListFixtureInput = Input<typeof listFixture>;

const handle = Effect.fn("fixture.list")(function* run(
  input: ListFixtureInput
) {
  const store = yield* FixtureStore;

  return yield* store.list({
    cursor: input.cursor,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listFixture>;

export { handle };
