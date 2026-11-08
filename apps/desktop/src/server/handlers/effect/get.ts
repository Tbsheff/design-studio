import type { Input } from "@design-studio/actions/_core/action";
import type { getEffect } from "@design-studio/actions/effect/get";
import { Effect } from "effect";

import { EffectStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type GetEffectInput = Input<typeof getEffect>;

const handle = Effect.fn("effect.get")(function* run(input: GetEffectInput) {
  const store = yield* EffectStore;

  const info = yield* store.get({
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });

  return { ...info, effects: info.effects.slice(0, input.limit) };
}) satisfies Handle<typeof getEffect>;

export { handle };
