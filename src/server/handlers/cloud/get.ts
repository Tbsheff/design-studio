import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getCloud } from "../../../shared/actions/cloud/get.js";
import { CloudClient } from "../../cloud/client.js";
import { CloudSession } from "../../cloud/session.js";
import type { Handle } from "../_core/handler.js";

type GetCloudInput = Input<typeof getCloud>;

const handle = Effect.fn("cloud.get")(function* run(_input: GetCloudInput) {
  const session = yield* CloudSession;
  const client = yield* CloudClient;
  const view = yield* session.current();

  if (view.state === "signed-in" && view.user === null) {
    const profile = yield* client
      .profile()
      .pipe(Effect.orElseSucceed(() => null));

    if (profile !== null) {
      yield* session.remember(profile);
    }
  }

  return yield* session.current();
}) satisfies Handle<typeof getCloud>;

export { handle };
