import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { publishShip } from "../../../shared/actions/ship/publish.js";
import { ShipRunner } from "../../ship/ship-runner.js";
import { ShipStore } from "../../ship/ship-store.js";
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
