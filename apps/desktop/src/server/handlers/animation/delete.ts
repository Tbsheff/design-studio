import type { Input } from "@design-studio/actions/_core/action";
import type { deleteAnimation } from "@design-studio/actions/animation/delete";
import { Effect } from "effect";

import { AnimationStore, AnimationWriter } from "../../state-styles/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type DeleteAnimationInput = Input<typeof deleteAnimation>;

interface DeleteCommand {
  readonly animationId: string;
  readonly directionId: string;
  readonly projectId: string;
}

const toCommand = (input: DeleteAnimationInput): DeleteCommand => ({
  animationId: input.animationId,
  directionId: input.directionId,
  projectId: input.projectId,
});

const handle = Effect.fn("animation.delete")(function* run(
  input: DeleteAnimationInput
) {
  const writer = yield* AnimationWriter;

  return yield* writer.delete(toCommand(input));
}) satisfies Handle<typeof deleteAnimation>;

const preview = Effect.fn("animation.delete.preview")(function* card(
  input: DeleteAnimationInput
) {
  const store = yield* AnimationStore;
  const removal = yield* store.previewDelete(toCommand(input));

  return {
    action: "Delete a keyframe animation",
    detail: `Removes the timeline and its CSS block. Files that change: ${removal.files.join(", ")}.`,
    title: `Delete the animation ${removal.name}`,
  };
}) satisfies Preview<typeof deleteAnimation>;

export { handle, preview };
