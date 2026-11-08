import type { Input } from "@design-studio/actions/_core/action";
import type { deleteFixture } from "@design-studio/actions/fixture/delete";
import { Effect } from "effect";

import { FixtureStore, FixtureWriter } from "../../direct-edit/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteFixtureInput = Input<typeof deleteFixture>;

const handle = Effect.fn("fixture.delete")(function* run(
  input: DeleteFixtureInput
) {
  const writer = yield* FixtureWriter;

  return yield* writer.delete({
    fixtureId: input.fixtureId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof deleteFixture>;

const preview = Effect.fn("fixture.delete.preview")(function* card(
  input: DeleteFixtureInput
) {
  const store = yield* FixtureStore;
  const fixture = yield* store.get(input.projectId, input.fixtureId);

  return {
    action: "Delete a data fixture",
    detail: `Removes the page file ${fixture.file} and the canvas frame ${fixture.frameId}. The source route ${fixture.sourceRoute} stays as it is.`,
    title: `Delete the fixture ${fixture.route}`,
  };
}) satisfies Preview<typeof deleteFixture>;

export { handle, preview };
