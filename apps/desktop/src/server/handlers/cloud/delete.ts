import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deleteCloud } from "@design-studio/actions/cloud/delete";
import { CloudSession } from "../../cloud/index.js";
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
