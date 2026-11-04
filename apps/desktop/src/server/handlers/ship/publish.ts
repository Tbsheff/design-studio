import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { publishShip } from "@design-studio/actions/ship/publish";
import { ShipRunner, ShipStore } from "../../ship/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type PublishShipInput = Input<typeof publishShip>;

const handle = Effect.fn("ship.publish")(function* run(
  input: PublishShipInput
) {
  const runner = yield* ShipRunner;

  return yield* runner.publish(input.projectId, input);
}) satisfies Handle<typeof publishShip>;

const preview = Effect.fn("ship.publish.preview")(function* card(
  input: PublishShipInput
) {
  const store = yield* ShipStore;

  return yield* store.publishCard(input.projectId, input);
}) satisfies Preview<typeof publishShip>;

export { handle, preview };
