import type { Input } from "@design-studio/actions/_core/action";
import type { setTweakDirectEdit } from "@design-studio/actions/direct-edit/set-tweak";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetTweakDirectEditInput = Input<typeof setTweakDirectEdit>;

const handle = Effect.fn("direct-edit.setTweak")(function* run(
  input: SetTweakDirectEditInput
) {
  const service = yield* DirectEditWriter;

  const result = yield* service.commitTweaks(toRef(input), {
    values: { [input.id]: input.value },
  });

  const control = result.state.controls.find((item) => item.id === input.id);

  return {
    cssVar: control?.cssVar ?? null,
    id: input.id,
    title: result.version.title,
    value: result.state.current[input.id] ?? input.value,
    versionId: result.version.id,
  };
}) satisfies Handle<typeof setTweakDirectEdit>;

export { handle };
