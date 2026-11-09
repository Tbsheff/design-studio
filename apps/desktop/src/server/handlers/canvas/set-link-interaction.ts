import type { Input } from "@design-studio/actions/_core/action";
import type { setLinkInteractionCanvas } from "@design-studio/actions/canvas/set-link-interaction";
import { Effect } from "effect";

import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetLinkInteractionCanvasInput = Input<typeof setLinkInteractionCanvas>;

const handle = Effect.fn("canvas.setLinkInteraction")(function* run(
  input: SetLinkInteractionCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.interact({
    action: input.action ?? null,
    delayMs: input.delayMs ?? null,
    duration: input.duration ?? null,
    easing: input.easing ?? null,
    fromFrame: input.fromFrame ?? null,
    isWhenCleared: input.whenName === null,
    key: input.key ?? null,
    linkId: input.linkId ?? null,
    projectId: input.projectId,
    selector: input.selector ?? null,
    target: input.target ?? null,
    toFrame: input.toFrame ?? null,
    transition: input.transition ?? null,
    trigger: input.trigger ?? null,
    url: input.url ?? null,
    variableName: input.variableName ?? null,
    variableOp: input.variableOp ?? null,
    variableValue: input.variableValue ?? null,
    visibility: input.visibility ?? null,
    whenEquals: input.whenEquals ?? null,
    whenName: input.whenName ?? null,
  });
}) satisfies Handle<typeof setLinkInteractionCanvas>;

export { handle };
