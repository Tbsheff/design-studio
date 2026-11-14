import type { Input } from "@design-studio/actions/_core/action";
import type { setCloud } from "@design-studio/actions/cloud/set";
import { Effect } from "effect";

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
