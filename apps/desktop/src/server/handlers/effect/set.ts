import type { Input } from "@design-studio/actions/_core/action";
import type { setEffect } from "@design-studio/actions/effect/set";
import { Effect } from "effect";

import { EffectWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type SetEffectInput = Input<typeof setEffect>;

const handle = Effect.fn("effect.set")(function* run(input: SetEffectInput) {
  const writer = yield* EffectWriter;
  const { target } = input;

  return yield* writer.set({
    directionId: input.directionId,
    effects: input.effects ?? null,
    hasStyleName: "styleName" in input,
    projectId: input.projectId,
    styleName: input.styleName ?? null,
    target: {
      selector: target.selector ?? null,
      source: target.source,
      tag: target.tag ?? null,
    },
  });
}) satisfies Handle<typeof setEffect>;

export { handle };
