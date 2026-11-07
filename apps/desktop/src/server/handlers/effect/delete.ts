import type { Input } from "@design-studio/actions/_core/action";
import type { deleteEffect } from "@design-studio/actions/effect/delete";
import { Effect } from "effect";

import { EffectStore, EffectWriter } from "../../direct-edit/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteEffectInput = Input<typeof deleteEffect>;

const handle = Effect.fn("effect.delete")(function* run(
  input: DeleteEffectInput
) {
  const writer = yield* EffectWriter;

  return yield* writer.delete({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof deleteEffect>;

const preview = Effect.fn("effect.delete.preview")(function* card(
  input: DeleteEffectInput
) {
  const store = yield* EffectStore;

  const found = yield* store.preview({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
  });

  return {
    action: "Delete an effect style",
    detail: `Removes the effect style ${found.name} from ${found.files.join(", ")}. ${found.usedBy} layer references use it. They keep the class name and lose the look.`,
    title: `Delete the effect style ${found.name}`,
  };
}) satisfies Preview<typeof deleteEffect>;

export { handle, preview };
