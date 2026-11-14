import type { inspectImage } from "@design-studio/actions/image/inspect";
import { Effect } from "effect";

import { ImageProviderStore } from "../../image-generate/index.js";
import type { Handle } from "../_core/handler.js";

const handle = Effect.fn("image.inspect")(function* run() {
  const reader = yield* ImageProviderStore;

  return yield* reader.inspect();
}) satisfies Handle<typeof inspectImage>;

export { handle };
