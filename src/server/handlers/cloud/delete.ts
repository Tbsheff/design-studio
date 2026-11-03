import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteCloud } from "../../../shared/actions/cloud/delete.js";
import { CloudSession } from "../../cloud/session.js";
import type { Handle } from "../_core/handler.js";

type DeleteCloudInput = Input<typeof deleteCloud>;

const handle = Effect.fn("cloud.delete")(function* run(
  _input: DeleteCloudInput
) {
  const session = yield* CloudSession;

  yield* session.clear();

  const view = yield* session.current();

  return { state: view.state };
}) satisfies Handle<typeof deleteCloud>;

export { handle };
