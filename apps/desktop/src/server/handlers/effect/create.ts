import type { Input } from "@design-studio/actions/_core/action";
import type { createEffect } from "@design-studio/actions/effect/create";
import { Effect } from "effect";

import { EffectWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type CreateEffectInput = Input<typeof createEffect>;

const handle = Effect.fn("effect.create")(function* run(
  input: CreateEffectInput
) {
  const writer = yield* EffectWriter;

  return yield* writer.create({
    directionId: input.directionId,
    effects: input.effects,
    name: input.name,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createEffect>;

export { handle };
