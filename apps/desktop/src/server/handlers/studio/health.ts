import type { Input } from "@design-studio/actions/_core/action";
import type { healthStudio } from "@design-studio/actions/studio/health";
import { Effect } from "effect";

import { StudioInfo } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type HealthStudioInput = Input<typeof healthStudio>;

const handle = Effect.fn("studio.health")(function* run(
  _input: HealthStudioInput
) {
  const info = yield* StudioInfo;

  return {
    ok: true,
    previewOrigin: info.previewOrigin,
    version: info.version,
  };
}) satisfies Handle<typeof healthStudio>;

export { handle };
