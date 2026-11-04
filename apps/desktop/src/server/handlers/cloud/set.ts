import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setCloud } from "../../../shared/actions/cloud/set.js";
import { CloudSessionWriter } from "../../cloud/index.js";
import type { Handle } from "../_core/handler.js";

type SetCloudInput = Input<typeof setCloud>;

const handle = Effect.fn("cloud.set")(function* run(input: SetCloudInput) {
  const writer = yield* CloudSessionWriter;

  const view = yield* writer.store({
    expiresAt: input.expiresAt,
    jwt: input.jwt,
  });

  return { state: view.state };
}) satisfies Handle<typeof setCloud>;

export { handle };
