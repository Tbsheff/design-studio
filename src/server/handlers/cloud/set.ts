import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setCloud } from "../../../shared/actions/cloud/set.js";
import { CloudClient, CloudSession } from "../../cloud/index.js";
import type { Handle } from "../_core/handler.js";

type SetCloudInput = Input<typeof setCloud>;

const handle = Effect.fn("cloud.set")(function* run(input: SetCloudInput) {
  const session = yield* CloudSession;
  const client = yield* CloudClient;

  yield* session.set({ expiresAt: input.expiresAt, jwt: input.jwt });

  const profile = yield* client
    .profile()
    .pipe(Effect.orElseSucceed(() => null));

  if (profile !== null) {
    yield* session.remember(profile);
  }

  const view = yield* session.current();

  return { state: view.state };
}) satisfies Handle<typeof setCloud>;

export { handle };
