import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { healthStudio } from "../../../shared/actions/studio/health.js";
import { StudioInfo } from "../../store/studio-info.js";
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
